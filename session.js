"use strict";

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

async function continueSavedGame() {
  if (!hasSave() || transitioning) { showMessage("No saved story is available."); return; }
  const save = JSON.parse(localStorage.getItem(SAVE_KEY));
  transitioning = true;
  transitionLayer.classList.add("is-dark");
  const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  await new Promise(resolve => setTimeout(resolve, delay));
  activeLines = save.lines;
  openingIndex = save.index;
  storyLocation = save.location === "spain" ? "spain" : "portugal";
  const main = document.getElementById("main-menu");
  main.classList.add("is-palace");
  main.classList.toggle("is-entrance", storyLocation === "portugal" && (openingIndex < 4 || openingIndex === palaceLines.length - 1));
  manuelSprite.style.backgroundImage = storyLocation === "spain" ? 'url("assets/charles-expressions.png")' : 'url("assets/manuel-expressions.png")';
  magellanFrame = -1;
  manuelFrame = -1;
  menuColumn.hidden = true;
  menuMessage.hidden = true;
  introScreen.hidden = true;
  storyScreen.hidden = false;
  storyScreen.classList.remove("is-waiting");
  renderOpening();
  palaceMusic.play().then(() => fadePalaceMusic(.3, 1000)).catch(() => {});
  transitionLayer.classList.remove("is-dark");
  await new Promise(resolve => setTimeout(resolve, delay));
  transitioning = false;
}

document.getElementById("return-menu").addEventListener("click", async () => {
  if (transitioning) return;
  if (!storyScreen.hidden) saveProgress();
  toggleGameMenu(false);
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
