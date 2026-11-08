"use strict";

// Main menu behavior

const SAVE_KEY = "pigafetta-save"; // change if you use a different save key later

const menuMessage = document.getElementById("menu-message");
const continueBtn = document.querySelector('[data-action="continue"]');

function hasSave() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    return save?.version === 1 && Array.isArray(save.lines) && save.lines.length > 0 && Number.isInteger(save.index) && save.index >= 0 && save.index < save.lines.length;
  } catch (e) {
    return false;
  }
}

function showMessage(text) {
  menuMessage.textContent = text;
}

// Actions: replace the showMessage calls with real behavior as you build each part.
const actions = {
  "new-game": () => {
    startIntroduction();
  },
  "continue": () => {
    continueSavedGame();
  },
  "settings": () => {
    showMessage("Settings: not built yet.");
  },
  "credits": () => {
    showMessage("Credits: not built yet.");
  },
};

document.querySelector(".menu-buttons").addEventListener("click", (event) => {
  const button = event.target.closest(".menu-btn");
  if (!button || button.disabled) return;
  const action = actions[button.dataset.action];
  if (action) action();
});

// Disable Continue when there's no save yet
continueBtn.disabled = !hasSave();

const palaceLines = [
  { speaker: "", text: "(Magellan stands before the entrance of the royal chambers, requesting an audience.)", direction: true },
  { speaker: "Ferdinand Magellan", text: "Your Majesty! Please, I humbly request an audience!" },
  { speaker: "", text: "(After some commotion, the King finally responds.)", direction: true },
  { speaker: "King Manuel I", text: "Enough of this racket! Bring him in." },
  { speaker: "", text: "(Magellan enters the royal chambers and bows deeply.)", direction: true },
  { speaker: "Ferdinand Magellan", text: "I kiss Your Majesty's hands and offer my most faithful respects." },
  { speaker: "Ferdinand Magellan", text: "I propose that I spearhead a voyage to search for a western sea route towards the Moluccas. In doing so, Portugal could bolster its control over the islands and strengthen its grip on the flow of spices." },
  { speaker: "", text: "(King Manuel considers the proposal but appears unconvinced.)", direction: true },
  { speaker: "King Manuel I", text: "I simply cannot entrust such a risky voyage to someone who is liable to work with the enemy. Have you even considered the feasibility of the plan you have proposed to me?" },
  { speaker: "King Manuel I", text: "There is no need for such a risky voyage." },
  { speaker: "King Manuel I", text: "Now, away with you!" },
  { speaker: "", text: "(Magellan is dismissed from the royal chambers.)", direction: true }
];
let openingIndex = 0;
let storyLocation = "portugal";
let activeLines = palaceLines;
let transitioning = false;
let typingTimer = 0;
let isTyping = false;
let visibleCharacters = 0;
let skipTypewriter = false;
let backdropTimer = 0;
let magellanFrame = -1;
let manuelFrame = -1;
const storyScreen = document.getElementById("story-screen");
const menuColumn = document.querySelector(".menu-column");
const transitionLayer = document.getElementById("scene-transition");
const nextDialogue = document.getElementById("dialogue-next");
const dialoguePanel = document.querySelector(".dialogue-panel");
const speakerElement = document.getElementById("dialogue-speaker");
const magellanSprite = document.getElementById("magellan-sprite");
const manuelSprite = document.getElementById("manuel-sprite");
function updateCharacterSprites(speakingLineStarted = false) {
  const line = activeLines[openingIndex];
  const magellanEmotion = storyLocation === "portugal" && openingIndex >= 8 ? 2 : 0;
  const manuelEmotion = storyLocation === "spain" ? (line.pleased ? 2 : 0) : openingIndex === 3 || openingIndex >= 7 ? 2 : 0;
  const magellanTalking = line.speaker === "Ferdinand Magellan";
  const manuelTalking = line.speaker === (storyLocation === "spain" ? "King Charles I" : "King Manuel I");
  manuelSprite.hidden = storyLocation === "portugal" && (openingIndex < 4 || openingIndex === palaceLines.length - 1);
  // Poses change only once a line is fully displayed: speakers use their talking pose.
  const nextMagellanFrame = magellanTalking ? 1 : magellanEmotion;
  const nextManuelFrame = manuelTalking ? 1 : manuelEmotion;
  if ((!speakingLineStarted || magellanTalking) && magellanFrame !== nextMagellanFrame) {
    magellanFrame = nextMagellanFrame;
    magellanSprite.style.backgroundPosition = `${nextMagellanFrame * 50}% 0`;
    magellanSprite.classList.remove("pose-pop");
    void magellanSprite.offsetWidth;
    magellanSprite.classList.add("pose-pop");
  }
  if (!manuelSprite.hidden && (!speakingLineStarted || manuelTalking) && manuelFrame !== nextManuelFrame) {
    manuelFrame = nextManuelFrame;
    manuelSprite.style.backgroundPosition = `${nextManuelFrame * 50}% 0`;
    manuelSprite.classList.remove("pose-pop");
    void manuelSprite.offsetWidth;
    manuelSprite.classList.add("pose-pop");
  }
  magellanSprite.classList.toggle("is-listening", manuelTalking);
  manuelSprite.classList.toggle("is-listening", magellanTalking);
  magellanSprite.setAttribute("aria-label", `Ferdinand Magellan, ${magellanTalking ? "talking" : magellanEmotion === 2 ? "disappointed" : "attentive"}`);
  manuelSprite.setAttribute("aria-label", `${storyLocation === "spain" ? "King Charles I" : "King Manuel I"}, ${manuelTalking ? "talking" : manuelEmotion === 2 ? "expressive" : "neutral"}`);
}
const palaceMusic = new Audio("music/Kevin%20Penkin%20-%20Caf%C3%A8%20Music%20d%E2%80%99Orth.mp3");
palaceMusic.loop = true;
palaceMusic.preload = "auto";
palaceMusic.volume = 0;
let palaceMusicFadeTimer = 0;

function playDrumStrike() {
  try {
    const DrumContext = window.AudioContext || window.webkitAudioContext;
    if (!DrumContext) return;
    const context = new DrumContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(120, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + .3);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(.45, now + .012);
    gain.gain.exponentialRampToValueAtTime(.001, now + .42);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + .45);
    oscillator.onended = () => context.close();
  } catch { /* Location title still appears if sound is unavailable. */ }
}

function fadePalaceMusic(target, duration = 2000) {
  clearInterval(palaceMusicFadeTimer);
  const start = palaceMusic.volume;
  const steps = Math.max(1, Math.round(duration / 40));
  let step = 0;
  palaceMusicFadeTimer = setInterval(() => {
    step++;
    palaceMusic.volume = Math.max(0, Math.min(1, start + (target - start) * step / steps));
    if (step >= steps) clearInterval(palaceMusicFadeTimer);
  }, 40);
}

function startPalaceScene() {
  storyLocation = "portugal";
  activeLines = palaceLines;
  magellanFrame = -1;
  manuelFrame = -1;
  manuelSprite.style.backgroundImage = 'url("assets/manuel-expressions.png")';
  palaceMusic.currentTime = 0;
  palaceMusic.volume = 0;
  palaceMusic.play().then(() => fadePalaceMusic(.3, 2400)).catch(() => {});
  // Apply the new background only while the black transition is fully covering it.
  changeScene(true, 3000, () => {
    document.getElementById("main-menu").classList.add("is-palace", "is-entrance");
  });
}

function setPalaceBackdrop(showEntrance) {
  const mainMenu = document.getElementById("main-menu");
  if (!mainMenu.classList.contains("is-palace") || mainMenu.classList.contains("is-entrance") === showEntrance) return;

  clearTimeout(backdropTimer);
  const fadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  transitionLayer.classList.add("is-dark");
  backdropTimer = setTimeout(() => {
    mainMenu.classList.toggle("is-entrance", showEntrance);
    requestAnimationFrame(() => transitionLayer.classList.remove("is-dark"));
  }, fadeDuration);
}

function renderOpening() {
  clearInterval(typingTimer);
  saveProgress();
  const line = activeLines[openingIndex];
  if (line.choice) { showSpainChoices(); return; }
  if (storyLocation === "portugal") setPalaceBackdrop(openingIndex < 4 || openingIndex === palaceLines.length - 1);
  const text = line.text;
  const textElement = document.getElementById("dialogue-text");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  skipTypewriter = reduceMotion;
  visibleCharacters = 0;
  isTyping = !skipTypewriter;
  // The current speaker changes into their talking pose as their line begins.
  updateCharacterSprites(true);
  dialoguePanel.classList.toggle("is-ready", skipTypewriter);
  textElement.classList.toggle("is-direction", Boolean(line.direction));
  speakerElement.textContent = line.speaker || "Narration";
  speakerElement.hidden = !line.speaker;
  nextDialogue.disabled = false;
  textElement.textContent = skipTypewriter ? text : "";
  if (skipTypewriter) updateCharacterSprites();
  if (!skipTypewriter) {
    typingTimer = setInterval(() => {
      visibleCharacters = Math.min(visibleCharacters + 2, text.length);
      textElement.textContent = text.slice(0, visibleCharacters);
      if (visibleCharacters >= text.length) { clearInterval(typingTimer); isTyping = false; dialoguePanel.classList.add("is-ready"); }
      if (visibleCharacters >= text.length) updateCharacterSprites();
    }, 24);
  }
}
async function changeScene(showStory, dialogueDelay = 0, prepareScene = null) {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  document.querySelector(".story-choices")?.setAttribute("hidden", "");
  transitionLayer.classList.add("is-dark");
  const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  await new Promise(resolve => setTimeout(resolve, delay));
  if (prepareScene) prepareScene();
  menuColumn.hidden = showStory;
  menuMessage.hidden = showStory;
  menuMessage.textContent = "";
  storyScreen.hidden = !showStory;
  if (!showStory) document.getElementById("main-menu").classList.remove("is-palace", "is-entrance");
  if (showStory) storyScreen.classList.toggle("is-waiting", dialogueDelay > 0);
  transitionLayer.classList.remove("is-dark");
  await new Promise(resolve => setTimeout(resolve, delay));
  if (showStory) {
    await new Promise(resolve => setTimeout(resolve, dialogueDelay));
    openingIndex = 0;
    renderOpening();
    storyScreen.classList.remove("is-waiting");
    const dialogue = document.querySelector(".dialogue");
    dialogue.classList.remove("dialogue-enter");
    void dialogue.offsetWidth;
    dialogue.classList.add("dialogue-enter");
  }
  transitioning = false;
  (showStory ? nextDialogue : document.querySelector('[data-action="new-game"]')).focus({ preventScroll: true });
}
function startStory() { changeScene(true); }
nextDialogue.addEventListener("click", () => {
  if (transitioning) return;
  if (isTyping) {
    clearInterval(typingTimer);
    document.getElementById("dialogue-text").textContent = activeLines[openingIndex].text;
    isTyping = false;
    updateCharacterSprites();
    skipTypewriter = true;
    dialoguePanel.classList.add("is-ready");
    return;
  }
  if (openingIndex < activeLines.length - 1) { openingIndex++; renderOpening(); }
  else if (storyLocation === "portugal") { startSpainScene(); }
  else { fadePalaceMusic(0, 1800); changeScene(false); }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !storyScreen.hidden && !transitioning) { toggleGameMenu(); return; }
  if (!document.getElementById("game-menu-panel").hidden) return;
  if (storyScreen.hidden || transitioning || event.repeat || event.ctrlKey || event.metaKey || event.altKey || ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(event.target.tagName)) return;
  if (event.code === "Space" || event.key === "Enter") { event.preventDefault(); nextDialogue.click(); }
});
