import { connectFirebase } from "./firebase-client.js";
import { tally } from "./vote-core.js";

let client, roomCode, room, stopRoom, tick, pendingChoice, closing = false;
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

document.getElementById("classroom-host").onclick = () => dialog.showModal();
document.getElementById("classroom-join").onclick = () => { location.href = "audience.html"; };
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
  const address = document.createElement("small");
  address.textContent = link.href;
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
  banner.append(title, qrImage, enlarge, anchor);
  stopRoom = client.onValue(client.ref(client.db, `rooms/${code}`), snapshot => {
    room = snapshot.val();
    if (!room || room.hostUid !== client.uid || room.expiresAt < client.now()) {
      roomCode = null;
      banner.textContent = "Classroom room expired. Create a new room.";
      return;
    }
    if (pendingChoice) drawVote();
  }, error => { banner.textContent = errorText(error); });
}

async function openVote(panel, choices, complete) {
  clearInterval(tick);
  pendingChoice = { panel, choices, complete };
  delete panel.dataset.voteState;
  panel.textContent = "Opening audience vote…";
  try {
    const path = client.ref(client.db, `rooms/${roomCode}/rounds/I-02`);
    await client.runTransaction(path, current => current || {
      question: "How will you plead with the King of Spain?",
      options: choices.map(choice => choice.label), status: "open", endsAt: client.now() + seconds * 1000
    });
    drawVote();
    tick = setInterval(drawVote, 250);
  } catch (error) { panel.textContent = errorText(error); }
}

function drawVote() {
  if (!pendingChoice) return;
  const round = room?.rounds?.["I-02"];
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
  // Keep the focused tiebreak buttons stable while the timer updates.
  if (panel.dataset.voteState !== round.status) {
    panel.replaceChildren();
    panel.dataset.voteState = round.status;
    const status = document.createElement("p");
    status.className = "vote-status";
    panel.append(status);
    pendingChoice.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.disabled = round.status !== "tie" || !leaders.includes(index);
      button.onclick = () => chooseWinner(index);
      panel.append(button);
    });
  }
  panel.querySelector(".vote-status").textContent = !client.online() ? "Connection lost—reconnecting…" : round.status === "tie" ? `${total} votes · ${total ? "Tie" : "No votes"} — host, select a highlighted choice` : `${left}s remaining · ${total} votes`;
  [...panel.querySelectorAll("button")].forEach((button, index) => {
    button.textContent = `${String.fromCharCode(65 + index)} — ${pendingChoice.choices[index].label}   (${counts[index]})`;
  });
  if (left === 0 && round.status === "open" && !closing && client.online()) closeVote();
}

async function closeVote() {
  closing = true;
  try {
    // The deadline in database rules has already stopped new votes. Close and
    // count atomically, including any vote committed just before the deadline.
    await client.runTransaction(client.ref(client.db, `rooms/${roomCode}/rounds/I-02`), round => {
      if (!round || round.status !== "open" || client.now() < round.endsAt) return;
      const { leaders } = tally(round);
      return { ...round, status: leaders.length === 1 ? "closed" : "tie", ...(leaders.length === 1 ? { winner: leaders[0] } : {}) };
    }, { applyLocally: false });
  } catch (error) { banner.textContent = errorText(error); }
  finally { closing = false; }
}

async function chooseWinner(index) {
  try {
    await client.runTransaction(client.ref(client.db, `rooms/${roomCode}/rounds/I-02`), round => {
      if (!round || round.status !== "tie" || !tally(round).leaders.includes(index)) return;
      return { ...round, winner: index, status: "closed" };
    }, { applyLocally: false });
  } catch (error) { banner.textContent = errorText(error); }
}

window.classroom = { isHost: () => Boolean(roomCode), openVote };
const previousRoom = sessionStorage.getItem("pigafetta-host-room");
if (previousRoom) {
  try {
    client = await connectFirebase();
    const previous = (await client.get(client.ref(client.db, `rooms/${previousRoom}`))).val();
    if (previous?.hostUid === client.uid && previous.expiresAt > client.now()) attachRoom(previousRoom);
    else sessionStorage.removeItem("pigafetta-host-room");
  } catch (error) { banner.hidden = false; banner.textContent = errorText(error); }
}
