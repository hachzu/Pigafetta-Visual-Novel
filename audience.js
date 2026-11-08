import { connectFirebase } from "./firebase-client.js";

const form = document.getElementById("join-room");
const input = document.getElementById("room-code");
const status = document.getElementById("audience-status");
const question = document.getElementById("audience-question");
const timer = document.getElementById("audience-timer");
const choices = document.getElementById("audience-choices");
let client, code, room, unsubscribe, clock, sending = false;
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
    form.hidden = true;
    unsubscribe = client.onValue(client.ref(client.db, `rooms/${code}`), snapshot => {
      room = snapshot.val();
      render();
    }, error => { status.textContent = error.message; });
    clock = setInterval(render, 250);
  } catch (error) {
    status.textContent = `${error.message} If sign-in is blocked, ask the host to enable Firebase Anonymous authentication and publish the voting rules.`;
  } finally { joinButton.disabled = false; }
});

function render() {
  if (!room || room.expiresAt < client.now()) {
    status.textContent = "This room has expired. Ask the host for a new code.";
    choices.replaceChildren();
    form.hidden = false;
    return;
  }
  const round = room.rounds?.["I-02"];
  if (!round) { status.textContent = `Room ${code} · Watch the projector. Voting will appear here.`; return; }
  const vote = round.votes?.[client.uid];
  const voted = Number.isInteger(vote);
  const open = round.status === "open" && client.now() < round.endsAt;
  question.textContent = round.question;
  timer.textContent = open ? `${Math.max(0, Math.ceil((round.endsAt - client.now()) / 1000))} seconds remaining` : "Voting closed";
  status.textContent = !client.online() ? "Connection lost—reconnecting…" : Number.isInteger(round.winner) ? `Choice ${String.fromCharCode(65 + round.winner)} won. Watch the projector!` : voted ? `Vote ${String.fromCharCode(65 + vote)} confirmed. Your vote is locked.` : open ? "Choose once. One vote per browser." : "Waiting for the host to resolve the result…";
  if (!choices.children.length) {
    round.options.forEach((label, index) => {
      const button = document.createElement("button");
      button.textContent = `${String.fromCharCode(65 + index)} — ${label}`;
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

if (input.value) form.requestSubmit();
