import { connectFirebase } from "./firebase-client.js";
import { tally } from "./vote-core.js";

let client, roomCode, room, stopRoom, tick, pendingChoice, closing = false;
let storySync = Promise.resolve();
const banner = document.createElement("aside");
banner.className = "room-banner";
banner.hidden = true;
document.body.append(banner);
const qrDialog = document.createElement("dialog");
qrDialog.className = "classroom-dialog qr-dialog";
qrDialog.innerHTML = '<h2>Scan to join the voyage</h2><div class="large-room-qr"></div><p class="qr-room-code"></p><button type="button">Back to story</button>';
qrDialog.querySelector("button").onclick = () => qrDialog.close();
document.body.append(qrDialog);
const dialog = document.createElement("dialog");
dialog.className = "classroom-dialog";
dialog.innerHTML = '<h2>Classroom voting</h2><p>Audience members join on their phones. Each browser gets one locked vote per question.</p><label>Voting time (seconds)<input id="vote-seconds" type="number" min="10" max="180" value="30"></label><button id="create-room">Create room</button><p id="room-message" role="status"></p><button id="close-room-dialog">Close</button>';
document.body.append(dialog);
const message = dialog.querySelector("#room-message");
const errorText = error => `${error.message} Check that Anonymous sign-in is enabled and database.rules.json has been published in Firebase.`;
let seconds = 30;
const stopHostingButton = document.getElementById("classroom-stop");

document.getElementById("classroom-host").onclick = () => dialog.showModal();
document.getElementById("classroom-join").onclick = () => { location.href = "audience.html"; };
stopHostingButton.onclick = stopHosting;
dialog.querySelector("#close-room-dialog").onclick = () => dialog.close();
dialog.querySelector("#create-room").onclick = async event => {
  event.target.disabled = true;
  message.textContent = "Connecting…";
  try {
    client ||= await connectFirebase();
    seconds = Math.max(10, Math.min(180, Number(dialog.querySelector("#vote-seconds").value) || 30));
    for (let attempt = 0; attempt < 5; attempt++) {
      const values = crypto.getRandomValues(new Uint32Array(1));
      const code = String(100000 + values[0] % 900000);
      const result = await client.runTransaction(client.ref(client.db, `rooms/${code}`), current => current ? undefined : {
        hostUid: client.uid, expiresAt: client.now() + 43100000, seconds
      });
      if (result.committed) { attachRoom(code); break; }
    }
    if (!roomCode) throw new Error("Could not reserve a room. Try again.");
    sessionStorage.setItem("pigafetta-host-room", roomCode);
    dialog.close();
    toggleGameMenu(false);
    if (!storyScreen.hidden && activeLines[openingIndex]?.choice) showSpainChoices();
  } catch (error) { message.textContent = errorText(error); }
  finally { event.target.disabled = false; }
};

function attachRoom(code) {
  if (stopRoom) stopRoom();
  roomCode = code;
  stopHostingButton.hidden = false;
  const currentLine = activeLines?.[openingIndex];
  if (!storyScreen.hidden && currentLine) {
    syncDialogue(currentLine.choice
      ? { speaker: "", text: currentChoiceSet().question, direction: false }
      : { speaker: currentLine.speaker || "", text: currentLine.text, direction: Boolean(currentLine.direction) });
  }
  banner.hidden = false;
  const link = new URL("audience.html", location.href);
  link.searchParams.set("room", code);
  banner.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `Room ${code}`;
  const anchor = document.createElement("a");
  anchor.href = link.href;
  anchor.textContent = "Audience join link";
  anchor.target = "_blank";
  const qr = window.qrcode(0, "M");
  qr.addData(link.href);
  qr.make();
  const qrImage = document.createElement("img");
  qrImage.src = qr.createDataURL(8, 32);
  qrImage.alt = `Scan to join classroom room ${code}`;
  qrImage.className = "room-qr";
  const enlarge = document.createElement("button");
  enlarge.className = "enlarge-qr";
  enlarge.textContent = "Enlarge QR code";
  enlarge.onclick = () => qrDialog.showModal();
  qrDialog.querySelector(".large-room-qr").replaceChildren(qrImage.cloneNode());
  qrDialog.querySelector(".qr-room-code").textContent = `Room ${code}`;
  const header = document.createElement("div");
  header.className = "room-panel-handle";
  header.tabIndex = 0;
  header.setAttribute("aria-label", "Move room panel with arrow keys, or drag");
  const collapse = document.createElement("button");
  collapse.className = "room-panel-collapse";
  collapse.type = "button";
  collapse.textContent = "−";
  collapse.setAttribute("aria-label", "Collapse room panel");
  collapse.setAttribute("aria-expanded", "true");
  const content = document.createElement("div");
  content.id = "room-panel-content";
  collapse.setAttribute("aria-controls", content.id);
  content.append(qrImage, enlarge, anchor);
  header.append(title, collapse);
  banner.append(header, content);
  collapse.onclick = () => {
    content.hidden = !content.hidden;
    collapse.textContent = content.hidden ? "+" : "−";
    collapse.setAttribute("aria-expanded", String(!content.hidden));
    collapse.setAttribute("aria-label", content.hidden ? "Expand room panel" : "Collapse room panel");
    keepRoomPanelOnScreen();
  };
  makeRoomPanelDraggable(header);
  stopRoom = client.onValue(client.ref(client.db, `rooms/${code}`), snapshot => {
    room = snapshot.val();
    if (!room || room.hostUid !== client.uid || room.expiresAt < client.now()) {
      roomCode = null;
      stopHostingButton.hidden = true;
      banner.textContent = "Classroom room expired. Create a new room.";
      return;
    }
    if (pendingChoice) drawVote();
  }, error => { banner.textContent = errorText(error); });
}

async function stopHosting() {
  if (!roomCode || !client) return;
  const stoppedCode = roomCode;
  stopHostingButton.disabled = true;
  try {
    await client.remove(client.ref(client.db, `rooms/${stoppedCode}`));
  } catch (error) {
    banner.textContent = errorText(error);
    return;
  } finally {
    stopHostingButton.disabled = false;
  }
  if (stopRoom) stopRoom();
  clearInterval(tick);
  pendingChoice = null;
  roomCode = null;
  room = null;
  sessionStorage.removeItem("pigafetta-host-room");
  banner.hidden = true;
  stopHostingButton.hidden = true;
  if (!choicePanel.hidden && activeLines[openingIndex]?.choice) showSpainChoices();
}

function moveRoomPanel(x, y) {
  banner.style.left = `${Math.max(0, Math.min(x, innerWidth - banner.offsetWidth))}px`;
  banner.style.top = `${Math.max(0, Math.min(y, innerHeight - banner.offsetHeight))}px`;
}
function keepRoomPanelOnScreen() {
  const rect = banner.getBoundingClientRect();
  moveRoomPanel(rect.left, rect.top);
}
window.addEventListener("resize", keepRoomPanelOnScreen);
function makeRoomPanelDraggable(handle) {
  let drag;
  handle.addEventListener("pointerdown", event => {
    if (event.target.closest("button") || event.button !== 0) return;
    const rect = banner.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("is-dragging");
  });
  handle.addEventListener("pointermove", event => {
    if (drag) moveRoomPanel(event.clientX - drag.x, event.clientY - drag.y);
  });
  const end = () => { drag = null; handle.classList.remove("is-dragging"); };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
  handle.addEventListener("lostpointercapture", end);
  handle.addEventListener("keydown", event => {
    if (event.target !== handle) return;
    const movement = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
    if (!movement) return;
    event.preventDefault();
    const rect = banner.getBoundingClientRect();
    moveRoomPanel(rect.left + movement[0], rect.top + movement[1]);
  });
}

async function openVote(panel, choices, complete, roundId = "I-02", question = "How should Magellan persuade Spain?") {
  clearInterval(tick);
  pendingChoice = { panel, choices, complete, roundId };
  delete panel.dataset.voteState;
  panel.textContent = "Opening audience vote…";
  try {
    const path = client.ref(client.db, `rooms/${roomCode}/rounds/${roundId}`);
    const options = choices.map(choice => choice.label);
    await client.runTransaction(path, current => current
      ? { ...current, question, options }
      : { question, options, status: "open", endsAt: client.now() + seconds * 1000 });
    await client.set(client.ref(client.db, `rooms/${roomCode}/activeRound`), roundId);
    drawVote();
    tick = setInterval(drawVote, 250);
  } catch (error) { panel.textContent = errorText(error); }
}

function drawVote() {
  if (!pendingChoice) return;
  const round = room?.rounds?.[pendingChoice.roundId];
  if (!round) return;
  if (Number.isInteger(round.winner)) {
    const done = pendingChoice.complete;
    pendingChoice = null;
    clearInterval(tick);
    done(round.winner);
    return;
  }
  const { counts, total, leaders } = tally(round);
  const left = Math.max(0, Math.ceil((round.endsAt - client.now()) / 1000));
  const panel = pendingChoice.panel;
  const audienceCount = Object.keys(room?.presence || {}).filter(uid => uid !== client.uid).length;
  const hostCanChoose = round.status === "open" && audienceCount === 0;
  // Keep the focused tiebreak buttons stable while the timer updates.
  const voteState = `${round.status}-${hostCanChoose}`;
  if (panel.dataset.voteState !== voteState) {
    panel.replaceChildren();
    panel.dataset.voteState = voteState;
    const status = document.createElement("p");
    status.className = "vote-status";
    panel.append(status);
    pendingChoice.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.className = "host-vote-choice";
      button.style.animationDelay = `${.1 + index * .08}s`;
      button.disabled = hostCanChoose ? false : round.status !== "tie" || !leaders.includes(index);
      button.onclick = () => chooseWinner(index, hostCanChoose);
      button.textContent = choice.label;
      panel.append(button);
    });
    const footer = document.createElement("div");
    footer.className = "vote-footer";
    footer.innerHTML = '<p class="vote-timer"></p><p class="vote-total"></p>';
    panel.append(footer);
  }
  panel.querySelector(".vote-status").textContent = !client.online() ? "Reconnecting" : hostCanChoose ? "Choose a path" : round.status === "tie" ? "Tie: choose a path" : "Please vote!";
  panel.querySelector(".vote-timer").textContent = round.status === "open" ? `${left} seconds remaining` : "Voting closed";
  panel.querySelector(".vote-total").textContent = `Votes: ${total}`;
  if (left === 0 && round.status === "open" && !closing && client.online()) closeVote();
}

async function closeVote() {
  closing = true;
  try {
    // The deadline in database rules has already stopped new votes. Close and
    // count atomically, including any vote committed just before the deadline.
    await client.runTransaction(client.ref(client.db, `rooms/${roomCode}/rounds/${pendingChoice.roundId}`), round => {
      if (!round || round.status !== "open" || client.now() < round.endsAt) return;
      const { leaders } = tally(round);
      return { ...round, status: leaders.length === 1 ? "closed" : "tie", ...(leaders.length === 1 ? { winner: leaders[0] } : {}) };
    }, { applyLocally: false });
  } catch (error) { banner.textContent = errorText(error); }
  finally { closing = false; }
}

async function chooseWinner(index, hostChoice = false) {
  try {
    await client.runTransaction(client.ref(client.db, `rooms/${roomCode}/rounds/${pendingChoice.roundId}`), round => {
      const noAudience = Object.keys(room?.presence || {}).filter(uid => uid !== client.uid).length === 0;
      const validTieBreak = round?.status === "tie" && tally(round).leaders.includes(index);
      const validHostChoice = hostChoice && round?.status === "open" && noAudience;
      if (!validTieBreak && !validHostChoice) return;
      return { ...round, winner: index, status: "closed" };
    }, { applyLocally: false });
  } catch (error) { banner.textContent = errorText(error); }
}

function syncDialogue(dialogue) {
  if (!roomCode || !client) return;
  // Queue updates so a fast host click cannot let an older line overwrite a newer one.
  storySync = storySync.catch(() => {}).then(() => client.set(
    client.ref(client.db, `rooms/${roomCode}/story`),
    { ...dialogue, updatedAt: client.now() }
  )).catch(error => { banner.textContent = errorText(error); });
}

window.classroom = { isHost: () => Boolean(roomCode), openVote, syncDialogue };
const previousRoom = sessionStorage.getItem("pigafetta-host-room");
if (previousRoom) {
  try {
    client = await connectFirebase();
    const previous = (await client.get(client.ref(client.db, `rooms/${previousRoom}`))).val();
    if (previous?.hostUid === client.uid && previous.expiresAt > client.now()) attachRoom(previousRoom);
    else sessionStorage.removeItem("pigafetta-host-room");
  } catch (error) { banner.hidden = false; banner.textContent = errorText(error); }
}
