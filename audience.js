import { connectFirebase } from "./firebase-client.js";

const form = document.getElementById("join-room");
const input = document.getElementById("room-code");
const status = document.getElementById("audience-status");
const question = document.getElementById("audience-question");
const timer = document.getElementById("audience-timer");
const choices = document.getElementById("audience-choices");
let client, code, room, unsubscribe, clock, presenceRef, sending = false;
const fromLink = new URL(location.href).searchParams.get("room");
if (/^\d{6}$/.test(fromLink || "")) input.value = fromLink;

form.addEventListener("submit", async event => {
  event.preventDefault();
  const joinButton = form.querySelector("button");
  joinButton.disabled = true;
  status.textContent = "Joining…";
  try {
    client ||= await connectFirebase();
    code = input.value.trim();
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit room code.");
    const snapshot = await client.get(client.ref(client.db, `rooms/${code}`));
    const data = snapshot.val();
    if (!data || data.expiresAt < client.now()) throw new Error("Room not found or expired. Check the projector code.");
    if (data.hostUid === client.uid) throw new Error("This browser is the host. Join from an audience device.");
    if (unsubscribe) unsubscribe();
    clearInterval(clock);
    presenceRef = client.ref(client.db, `rooms/${code}/presence/${client.uid}`);
    await client.onDisconnect(presenceRef).remove();
    await client.set(presenceRef, true);
    form.hidden = true;
    unsubscribe = client.onValue(client.ref(client.db, `rooms/${code}`), snapshot => {
      room = snapshot.val();
      render();
    }, error => { status.textContent = error.message; });
    clock = setInterval(render, 250);
  } catch (error) {
    form.hidden = false;
    status.textContent = "Unable to join. Check the room code or ask the host.";
  } finally { joinButton.disabled = false; }
});

window.addEventListener("pagehide", () => {
  if (client && presenceRef) client.remove(presenceRef).catch(() => {});
});

function render() {
  if (!room || room.expiresAt < client.now()) {
    status.textContent = "This room has expired. Ask the host for a new code.";
    choices.replaceChildren();
    form.hidden = false;
    return;
  }
  const round = room.rounds?.["I-02"];
  if (!round) {
    status.textContent = "Currently waiting for the voting prompt! Please watch the projector!";
    question.textContent = "";
    timer.textContent = "";
    choices.replaceChildren();
    return;
  }
  const vote = round.votes?.[client.uid];
  const voted = Number.isInteger(vote);
  const open = round.status === "open" && client.now() < round.endsAt;
  question.textContent = round.question;
  timer.textContent = open ? `${Math.max(0, Math.ceil((round.endsAt - client.now()) / 1000))}s` : "";
  status.textContent = !client.online() ? "Reconnecting…" : voted && open ? "Vote recorded." : !open ? "Please watch the projector!" : "";
  if (!choices.children.length) {
    round.options.forEach((label, index) => {
      const button = document.createElement("button");
      button.className = "dialogue-panel audience-choice dialogue-enter";
      button.style.animationDelay = `${index * 80}ms`;
      const pattern = document.createElement("span");
      pattern.className = "dialogue-icons";
      pattern.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.className = "audience-choice-copy";
      copy.textContent = label;
      button.append(pattern, copy);
      button.addEventListener("click", () => castVote(index));
      choices.append(button);
    });
  }
  [...choices.children].forEach((button, index) => {
    button.disabled = sending || voted || !open || !client.online();
    button.classList.toggle("selected", vote === index);
    button.setAttribute("aria-pressed", String(vote === index));
  });
}

async function castVote(index) {
  if (sending || !client.online()) return;
  sending = true;
  render();
  try {
    const result = await client.runTransaction(client.ref(client.db, `rooms/${code}/rounds/I-02/votes/${client.uid}`), current => current === null ? index : undefined, { applyLocally: false });
    if (!result.committed) status.textContent = "Your vote has already been recorded.";
  } catch (error) { status.textContent = "Vote not accepted. Voting may have closed, or the connection failed. " + error.message; }
  finally { sending = false; render(); }
}

if (input.value) { form.hidden = true; form.requestSubmit(); }
