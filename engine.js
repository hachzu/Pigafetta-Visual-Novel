"use strict";

// ===== Shared story engine (formerly script.js) =====
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
  "chapters": () => {
    document.getElementById("chapters-menu").showModal();
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
let homonhonBackdrop = "island";
let limasawaCg = false;
let cebuBackdrop = "";
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
// Homonhon's left slot is shared. Who stands there at the current line:
// a line's `with` ("enrique", "natives", or "none") wins; otherwise a native or Enrique speaking
// puts them there; otherwise whoever was there on the previous line stays.
let leftCast = "";
// Left-slot characters in the Homonhon, Limasawa and Cebu scenes.
const castNames = { natives: "Natives", enrique: "Enrique of Malacca", calambu: "Rajah Calambu", humabon: "Rajah Humabon", humamay: "Hara Humamay", lapulapu: "Lapu-Lapu", pigafetta: "Antonio Pigafetta" };
const castSheets = { natives: "natives-expressions-square.png", enrique: "enrique-expressions-square.png", calambu: "rajah-calambu-expressions-square.png", humabon: "rajah-humabon-expressions-square.png", humamay: "hara-humamay-expressions-square.png", lapulapu: "lapu-lapu-expressions-square.png", pigafetta: "pigafetta-expressions.png" };
function castOf(speaker) {
  if (!speaker) return "";
  if (speaker.startsWith("Native")) return "natives";
  if (speaker === "Enrique of Malacca") return "enrique";
  if (speaker === "Rajah Calambu") return "calambu";
  if (speaker.startsWith("Rajah Humabon")) return "humabon";
  if (speaker.startsWith("Hara Humamay")) return "humamay";
  if (speaker.startsWith("Lapu-Lapu")) return "lapulapu";
  if (speaker.startsWith("Antonio Pigafetta")) return "pigafetta";
  return "";
}
function homonhonLeftCast() {
  let cast = "";
  for (const entry of activeLines.slice(0, openingIndex + 1)) {
    if (entry.with) cast = entry.with === "none" ? "" : entry.with;
    else if (castOf(entry.speaker)) cast = castOf(entry.speaker);
  }
  return cast;
}
function updateCharacterSprites(speakingLineStarted = false) {
  const line = activeLines[openingIndex];
  const magellanEmotion = storyLocation === "portugal" && openingIndex >= 8 ? 2 : 0;
  const manuelEmotion = storyLocation === "preparations" ? (openingIndex >= 4 ? 2 : 0) : storyLocation === "spain" ? (line.pleased ? 2 : 0) : storyLocation === "portugal" && (openingIndex === 3 || openingIndex >= 7) ? 2 : 0;
  const magellanTalking = line.speaker === "Ferdinand Magellan";
  const castScene = ["homonhon", "limasawa", "cebu", "mactan", "massacre", "brunei", "tidore", "returnvoyage", "homecoming"].includes(storyLocation);
  const cast = castScene ? homonhonLeftCast() : "";
  const companion = storyLocation === "preparations" ? "Rui Faleiro" : storyLocation === "departure" ? "Antonio Pigafetta" : storyLocation === "spain" ? "King Charles I" : castScene ? (castNames[cast] || "Enrique of Malacca") : "King Manuel I";
  const manuelTalking = castScene ? Boolean(cast) && castOf(line.speaker) === cast : line.speaker === companion;
  manuelSprite.hidden = storyLocation === "ocean" || (storyLocation === "departure" && openingIndex >= 5) || storyLocation === "portugal" && (openingIndex < 4 || openingIndex === palaceLines.length - 1);
  magellanSprite.hidden = storyLocation === "ocean";
  if (castScene) {
    // Magellan makes his entrance with his first line, then stays in the scene.
    // The left slot holds Enrique or the natives, whichever homonhonLeftCast() says is on stage.
    magellanSprite.hidden = !activeLines.slice(0, openingIndex + 1).some(entry => entry.speaker === "Ferdinand Magellan");
    manuelSprite.hidden = !cast;
    if (cast && cast !== leftCast) {
      // Swap sheets only when the cast changes, starting on the attentive frame.
      manuelSprite.style.backgroundImage = `url("assets/${castSheets[cast]}")`;
      manuelSprite.style.backgroundPosition = "0 0";
      manuelFrame = 0;
    }
    leftCast = cast || leftCast;
  }
  // Only entering a talking pose gets the pop animation.
  const nextMagellanFrame = magellanTalking ? 1 : magellanEmotion;
  const nextManuelFrame = manuelTalking ? 1 : manuelEmotion;
  if ((!speakingLineStarted || magellanTalking) && magellanFrame !== nextMagellanFrame) {
    magellanFrame = nextMagellanFrame;
    magellanSprite.style.backgroundPosition = `${nextMagellanFrame * 50}% 0`;
    magellanSprite.classList.remove("pose-pop");
    if (nextMagellanFrame === 1) {
      void magellanSprite.offsetWidth;
      magellanSprite.classList.add("pose-pop");
    }
  }
  if (!manuelSprite.hidden && (!speakingLineStarted || manuelTalking) && manuelFrame !== nextManuelFrame) {
    manuelFrame = nextManuelFrame;
    manuelSprite.style.backgroundPosition = `${nextManuelFrame * 50}% 0`;
    manuelSprite.classList.remove("pose-pop");
    if (nextManuelFrame === 1) {
      void manuelSprite.offsetWidth;
      manuelSprite.classList.add("pose-pop");
    }
  }
  magellanSprite.classList.toggle("is-listening", manuelTalking);
  manuelSprite.classList.toggle("is-listening", magellanTalking);
  magellanSprite.setAttribute("aria-label", `Ferdinand Magellan, ${magellanTalking ? "talking" : magellanEmotion === 2 ? "disappointed" : "attentive"}`);
  manuelSprite.setAttribute("aria-label", `${companion}, ${manuelTalking ? "talking" : manuelEmotion === 2 ? "expressive" : "neutral"}`);
}
const palaceMusic = new Audio("music/Kevin%20Penkin%20-%20Caf%C3%A8%20Music%20d%E2%80%99Orth.mp3");
palaceMusic.loop = true;
palaceMusic.preload = "auto";
palaceMusic.volume = 0;
let palaceMusicFadeTimer = 0;
let currentStoryTrack = "palace";
let lastStoryMusicCue = "";

function playSceneMusic(scene, restart = false) {
  const track = ["cebu", "mactan", "actthree", "massacre", "brunei", "tidore", "returnvoyage", "homecoming"].includes(scene) ? "cebu" : scene === "limasawa" ? "limasawa" : scene === "philippines" || scene === "homonhon" ? "philippines" : scene === "preparations" || scene === "departure" ? "seville" : "palace";
  clearInterval(palaceMusicFadeTimer);
  if (currentStoryTrack !== track) {
    palaceMusic.src = track === "cebu"
      ? "music/Kevin%20Penkin%20-%20Rafters.mp3"
      : track === "limasawa"
      ? "music/Kevin%20Penkin%20-%20Days%20in%20the%20Sun.mp3"
      : track === "philippines"
      ? "music/Kevin%20Penkin%20-%20Atla%20%26%20Fohl.mp3"
      : track === "seville"
      ? "music/Kana%20Inukai%20-%20Yeon%20Yihwa.mp3"
      : "music/Kevin%20Penkin%20-%20Caf%C3%A8%20Music%20d%E2%80%99Orth.mp3";
    currentStoryTrack = track;
    palaceMusic.volume = 0;
  }
  if (restart) { palaceMusic.currentTime = 0; palaceMusic.volume = 0; }
  palaceMusic.play().then(() => fadePalaceMusic(.3, 1800)).catch(() => {});
}

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

function playStoryMusicCue(cue) {
  if (!cue || cue === lastStoryMusicCue) return;
  lastStoryMusicCue = cue;
  if (cue !== "native-arrival") return;

  // Let the Philippine-arc music leave gently before the arrival cue enters.
  const fadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200;
  fadePalaceMusic(0, fadeDuration);
  setTimeout(() => {
    palaceMusic.src = "music/Kevin%20Penkin%20-%20Line.mp3";
    palaceMusic.currentTime = 0;
    palaceMusic.volume = 0;
    currentStoryTrack = "native-arrival";
    palaceMusic.play().then(() => fadePalaceMusic(.3, 1600)).catch(() => {});
  }, fadeDuration);
}

function startPalaceScene() {
  storyLocation = "portugal";
  activeLines = palaceLines;
  magellanFrame = -1;
  manuelFrame = -1;
  manuelSprite.style.backgroundImage = 'url("assets/manuel-expressions.png")';
  playSceneMusic("portugal", true);
  // Apply the new background only while the black transition is fully covering it.
  changeScene(true, 3000, () => {
    document.getElementById("main-menu").classList.remove("is-docks", "is-ocean", "is-homonhon");
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

function setHomonhonBackdrop(backdrop = "island") {
  if (homonhonBackdrop === backdrop) return;
  homonhonBackdrop = backdrop;
  const mainMenu = document.getElementById("main-menu");
  const classes = ["is-homonhon-ship", "is-homonhon-anchorage", "is-homonhon-native-boat"];
  const selected = backdrop === "ship"
    ? "is-homonhon-ship"
    : backdrop === "anchorage"
    ? "is-homonhon-anchorage"
    : backdrop === "native-boat"
    ? "is-homonhon-native-boat"
    : "";
  clearTimeout(backdropTimer);
  const fadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  transitionLayer.classList.add("is-dark");
  backdropTimer = setTimeout(() => {
    mainMenu.classList.remove(...classes);
    if (selected) mainMenu.classList.add(selected);
    requestAnimationFrame(() => transitionLayer.classList.remove("is-dark"));
  }, fadeDuration);
}

function setLimasawaBackdrop(showCg) {
  if (limasawaCg === showCg) return;
  limasawaCg = showCg;
  const mainMenu = document.getElementById("main-menu");
  clearTimeout(backdropTimer);
  const fadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  transitionLayer.classList.add("is-dark");
  backdropTimer = setTimeout(() => {
    mainMenu.classList.toggle("is-limasawa-cg", showCg);
    // The CG is a full picture, so the sprites step out while it shows.
    storyScreen.classList.toggle("is-cg", showCg);
    requestAnimationFrame(() => transitionLayer.classList.remove("is-dark"));
  }, fadeDuration);
}

function setCebuBackdrop(backdrop = "port") {
  if (cebuBackdrop === backdrop) return;
  cebuBackdrop = backdrop;
  const mainMenu = document.getElementById("main-menu");
  clearTimeout(backdropTimer);
  const fadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  transitionLayer.classList.add("is-dark");
  backdropTimer = setTimeout(() => {
    mainMenu.classList.toggle("is-cebu-square", backdrop === "square");
    requestAnimationFrame(() => transitionLayer.classList.remove("is-dark"));
  }, fadeDuration);
}

function renderOpening() {
  clearInterval(typingTimer);
  window.voice?.stop();
  saveProgress();
  if (storyLocation === "philippines" || storyLocation === "actthree") { renderVoyagePassage(); return; }
  const line = activeLines[openingIndex];
  if (line.choice) { showSpainChoices(); return; }
  if (line.card) { showTransitionCard(line); return; }
  if (storyLocation === "portugal") setPalaceBackdrop(openingIndex < 4 || openingIndex === palaceLines.length - 1);
  if (storyLocation === "homonhon") setHomonhonBackdrop(line.homonhonBackdrop || "island");
  if (storyLocation === "limasawa") setLimasawaBackdrop(Boolean(line.cg));
  if (storyLocation === "cebu") setCebuBackdrop(line.cebuBackdrop || "port");
  storyScreen.classList.toggle("is-stage-clear", Boolean(line.clearStage));
  if (line.musicCue) setTimeout(() => playStoryMusicCue(line.musicCue), 0);
  const text = line.text;
  window.classroom?.syncDialogue?.({ speaker: line.speaker || "", text, direction: Boolean(line.direction) });
  window.voice?.play(line, activeLines[openingIndex + 1]);
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
  paintDialogueText(textElement, skipTypewriter ? text : "", line.italic);
  if (skipTypewriter) updateCharacterSprites();
  if (!skipTypewriter) {
    typingTimer = setInterval(() => {
      visibleCharacters = Math.min(visibleCharacters + 2, text.length);
      paintDialogueText(textElement, text.slice(0, visibleCharacters), line.italic);
      if (visibleCharacters >= text.length) { clearInterval(typingTimer); isTyping = false; dialoguePanel.classList.add("is-ready"); }
      if (visibleCharacters >= text.length) updateCharacterSprites();
    }, 24);
  }
}
function paintDialogueText(element, text, italic) {
  if (!italic || !text.includes(italic)) { element.textContent = text; return; }
  const start = text.indexOf(italic);
  const emphasis = document.createElement("em");
  emphasis.textContent = italic;
  element.replaceChildren(text.slice(0, start), emphasis, text.slice(start + italic.length));
}
async function changeScene(showStory, dialogueDelay = 0, prepareScene = null) {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  clearTimeout(introTimer);
  introAdvance = null;
  chapterTitle.hidden = true;
  document.querySelector(".story-choices")?.setAttribute("hidden", "");
  storyScreen.classList.remove("is-choosing");
  transitionLayer.classList.add("is-dark");
  const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  await new Promise(resolve => setTimeout(resolve, delay));
  if (prepareScene) prepareScene();
  menuColumn.hidden = showStory;
  menuMessage.hidden = showStory;
  menuMessage.textContent = "";
  storyScreen.hidden = !showStory;
  if (!showStory) {
    document.getElementById("main-menu").classList.remove("is-palace", "is-entrance", "is-docks", "is-ocean", "is-homonhon", "is-homonhon-ship", "is-homonhon-anchorage", "is-homonhon-native-boat", "is-limasawa", "is-limasawa-cg", "is-departs-cebu", "is-cebu", "is-cebu-square", "is-mactan", "is-brunei", "is-tidore", "is-end");
    homonhonBackdrop = "";
    limasawaCg = false;
    cebuBackdrop = "";
    storyScreen.classList.remove("is-cg", "is-stage-clear");
  }
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
  // A choice scene may be open while the invisible dialogue button still exists.
  // Never let a stray click or key press advance past the choice checkpoint.
  if (activeLines[openingIndex]?.choice) return;
  if (isTyping) {
    clearInterval(typingTimer);
    paintDialogueText(document.getElementById("dialogue-text"), activeLines[openingIndex].text, activeLines[openingIndex].italic);
    isTyping = false;
    updateCharacterSprites();
    skipTypewriter = true;
    dialoguePanel.classList.add("is-ready");
    return;
  }
  window.voice?.stop();
  if (openingIndex < activeLines.length - 1) { openingIndex++; renderOpening(); }
  else if (storyLocation === "portugal") { startSpainScene(); }
  else if (storyLocation === "spain") { startSevilleScene(); }
  else if (storyLocation === "preparations") { startDepartureScene(); }
  else if (storyLocation === "departure") { startOceanScene(); }
  else if (storyLocation === "homonhon") { startLimasawaScene(); }
  else if (storyLocation === "limasawa") { startCebuTransition(); }
  else if (storyLocation === "cebu") { startMactanScene(); }
  else if (storyLocation === "mactan") { startActThreeIntro(); }
  else if (storyLocation === "massacre") { startCebuExitCard(); }
  else if (storyLocation === "brunei") { showCaptionCard("The ships continue toward the Moluccas.", "is-ocean", startTidoreScene); }
  else if (storyLocation === "tidore") { showCaptionCard("The two remaining ships are separated.", "is-ocean", startReturnVoyageScene); }
  else if (storyLocation === "returnvoyage") { showCaptionCard("The Spanish coastline appears on the horizon.", "is-ocean", startHomecomingScene); }
  else if (storyLocation === "homecoming") { startTheEnd(); }
  else { fadePalaceMusic(0, 1800); changeScene(false); }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !storyScreen.hidden && !transitioning) { toggleGameMenu(); return; }
  if (!document.getElementById("game-menu-panel").hidden) return;
  if (storyScreen.hidden || transitioning || event.repeat || event.ctrlKey || event.metaKey || event.altKey || ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(event.target.tagName)) return;
  if (event.code === "Space" || event.key === "Enter") { event.preventDefault(); nextDialogue.click(); }
});

// ===== Pause menu, save/continue, chapter jump (formerly session.js) =====

const gameMenuToggle = document.getElementById("game-menu-toggle");
const gameMenuPanel = document.getElementById("game-menu-panel");
function toggleGameMenu(force) {
  if (transitioning) return;
  const open = typeof force === "boolean" ? force : gameMenuPanel.hidden;
  gameMenuPanel.hidden = !open;
  gameMenuToggle.setAttribute("aria-expanded", String(open));
  if (open) document.getElementById("resume-game").focus();
  else gameMenuToggle.focus();
}
gameMenuToggle.addEventListener("click", () => toggleGameMenu());
document.getElementById("resume-game").addEventListener("click", () => toggleGameMenu(false));

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, location: storyLocation,
      lines: activeLines, index: openingIndex, savedAt: Date.now() }));
    continueBtn.disabled = false;
    document.getElementById("save-status").textContent = "Progress saved automatically.";
  } catch {
    document.getElementById("save-status").textContent = "This browser could not save your progress.";
  }
}

async function continueSavedGame(checkpoint = null) {
  if (transitioning) return;
  if (!checkpoint && !hasSave()) { showMessage("No saved story is available."); return; }
  const save = checkpoint || JSON.parse(localStorage.getItem(SAVE_KEY));
  transitioning = true;
  transitionLayer.classList.add("is-dark");
  const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  await new Promise(resolve => setTimeout(resolve, delay));
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  clearTimeout(introTimer);
  introAdvance = null;
  choicePanel.hidden = true;
  chapterTitle.hidden = true;
  storyScreen.classList.remove("is-choosing");
  activeLines = save.lines;
  openingIndex = save.index;
  storyLocation = ["spain", "preparations", "departure", "ocean", "philippines", "homonhon", "limasawa", "cebu", "mactan", "actthree", "massacre", "brunei", "tidore", "returnvoyage", "homecoming"].includes(save.location) ? save.location : "portugal";
  const main = document.getElementById("main-menu");
  main.classList.remove("is-homonhon-ship", "is-homonhon-anchorage", "is-homonhon-native-boat");
  homonhonBackdrop = "";
  limasawaCg = false;
  cebuBackdrop = "";
  main.classList.remove("is-limasawa-cg", "is-cebu-square");
  storyScreen.classList.remove("is-cg", "is-stage-clear");
  lastStoryMusicCue = "";
  main.classList.add("is-palace");
  main.classList.toggle("is-homonhon", storyLocation === "homonhon");
  main.classList.toggle("is-limasawa", storyLocation === "limasawa");
  main.classList.toggle("is-cebu", storyLocation === "cebu" || storyLocation === "massacre");
  main.classList.toggle("is-cebu-square", storyLocation === "massacre");
  main.classList.toggle("is-mactan", storyLocation === "mactan");
  main.classList.toggle("is-brunei", storyLocation === "brunei");
  main.classList.toggle("is-tidore", storyLocation === "tidore");
  main.classList.remove("is-departs-cebu");
  main.classList.toggle("is-docks", storyLocation === "preparations" || storyLocation === "departure" || storyLocation === "homecoming");
  main.classList.toggle("is-ocean", storyLocation === "ocean" || storyLocation === "philippines" || storyLocation === "actthree" || storyLocation === "returnvoyage");
  main.classList.toggle("is-entrance", storyLocation === "portugal" && (openingIndex < 4 || openingIndex === palaceLines.length - 1));
  manuelSprite.style.backgroundImage = storyLocation === "spain" ? 'url("assets/charles-expressions.png")' : 'url("assets/manuel-expressions.png")';
  if (storyLocation === "preparations") manuelSprite.style.backgroundImage = 'url("assets/rui-expressions.png")';
  if (storyLocation === "departure") manuelSprite.style.backgroundImage = 'url("assets/pigafetta-expressions.png")';
  leftCast = "";
  magellanFrame = -1;
  manuelFrame = -1;
  menuColumn.hidden = true;
  menuMessage.hidden = true;
  introScreen.hidden = true;
  storyScreen.hidden = false;
  storyScreen.classList.toggle("is-waiting", storyLocation === "philippines" || storyLocation === "actthree");
  renderOpening();
  if (storyLocation !== "ocean") playSceneMusic(storyLocation);
  transitionLayer.classList.remove("is-dark");
  await new Promise(resolve => setTimeout(resolve, delay));
  transitioning = false;
}

document.getElementById("return-menu").addEventListener("click", async () => {
  if (transitioning) return;
  if (!storyScreen.hidden) saveProgress();
  toggleGameMenu(false);
  window.voice?.stop();
  clearTimeout(introTimer);
  introAdvance = null;
  fadeMusic(0, 500);
  fadePalaceMusic(0, 500);
  // Hide the intro under the black cover so the shore never flashes through it.
  await changeScene(false, 0, () => {
    introScreen.hidden = true;
    introCopy.replaceChildren();
    introScreen.classList.remove("is-location");
    introStart.disabled = false;
    introStart.classList.remove("is-gone");
  });
});

document.getElementById("chapters-close").addEventListener("click", () => {
  document.getElementById("chapters-menu").close();
});
document.getElementById("chapters-menu").addEventListener("click", event => {
  const chapter = event.target.closest("[data-chapter]")?.dataset.chapter;
  const chapters = { portugal: palaceLines, spain: spainOpening, preparations: preparationLines, departure: departureLines, homonhon: homonhonOpening, limasawa: limasawaOpening, cebu: cebuOpening, mactan: mactanLines, actthree: actThreeNarration, massacre: massacreLines, brunei: bruneiLines, tidore: tidoreLines, returnvoyage: returnVoyageLines, homecoming: homecomingLines };
  if (!chapters[chapter] || transitioning) return;
  document.getElementById("chapters-menu").close();
  continueSavedGame({ location: chapter, lines: chapters[chapter], index: 0 });
});