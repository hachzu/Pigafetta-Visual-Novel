import { connectFirebase } from "./firebase-client.js";

const form = document.getElementById("join-room");
const input = document.getElementById("room-code");
const status = document.getElementById("audience-status");
const question = document.getElementById("audience-question");
const timer = document.getElementById("audience-timer");
const choices = document.getElementById("audience-choices");
const audienceDialogue = document.getElementById("audience-dialogue");
const audienceSpeaker = document.getElementById("audience-speaker");
const audienceDialogueText = document.getElementById("audience-dialogue-text");
let lastDialogueTime = 0;
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
    audienceDialogue.hidden = true;
    status.textContent = "This room has expired. Ask the host for a new code.";
    choices.replaceChildren();
    form.hidden = false;
    return;
  }
  const round = room.rounds?.["I-02"];
  renderDialogue(room.story);
  if (!round) {
    status.textContent = "Voting will appear here! Please keep an eye on the projector.";
    question.textContent = "";
    timer.textContent = "";
    choices.replaceChildren();
    return;
  }
  if (Number.isInteger(round.winner)) {
    question.textContent = "";
    timer.textContent = "";
    choices.replaceChildren();
    // Keep the choice prompt from lingering while the host moves into the branch.
    if (!room.story?.text || room.story.text === round.question) {
      audienceDialogue.hidden = true;
      status.textContent = "Voting will appear here! Please keep an eye on the projector.";
    } else {
      status.textContent = "";
    }
    return;
  }
  const vote = round.votes?.[client.uid];
  const voted = Number.isInteger(vote);
  const open = round.status === "open" && client.now() < round.endsAt;
  question.textContent = round.question;
  timer.textContent = open ? `${Math.max(0, Math.ceil((round.endsAt - client.now()) / 1000))}s` : "";
  status.textContent = !client.online() ? "Reconnecting" : !open ? "Please watch the projector!" : "";
  if (!choices.children.length) {
    round.options.forEach((label, index) => {
      const button = document.createElement("button");
      button.className = "dialogue-panel audience-choice";
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
    button.disabled = sending || !open || !client.online();
    button.classList.toggle("selected", vote === index);
    button.setAttribute("aria-pressed", String(vote === index));
  });
}

async function castVote(index) {
  if (sending || !client.online()) return;
  sending = true;
  render();
  try {
    await client.runTransaction(client.ref(client.db, `rooms/${code}/rounds/I-02/votes/${client.uid}`), () => index, { applyLocally: false });
  } catch { status.textContent = "Voting is closed or unavailable."; }
  finally { sending = false; render(); }
}

if (input.value) { form.hidden = true; form.requestSubmit(); }

function renderDialogue(story) {
  if (!story?.text) {
    audienceDialogue.hidden = true;
    return;
  }
  audienceDialogue.hidden = false;
  audienceSpeaker.textContent = story.speaker || "";
  audienceSpeaker.hidden = !story.speaker;
  audienceDialogueText.textContent = story.text;
  audienceDialogueText.classList.toggle("is-direction", Boolean(story.direction));
  if (story.updatedAt !== lastDialogueTime) {
    lastDialogueTime = story.updatedAt;
    audienceDialogue.classList.remove("dialogue-enter");
    void audienceDialogue.offsetWidth;
    audienceDialogue.classList.add("dialogue-enter");
  }
}
