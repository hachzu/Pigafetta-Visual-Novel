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
  storyLocation = ["spain", "preparations", "departure", "ocean", "philippines", "homonhon"].includes(save.location) ? save.location : "portugal";
  const main = document.getElementById("main-menu");
  main.classList.remove("is-homonhon-ship", "is-homonhon-anchorage", "is-homonhon-native-boat");
  homonhonBackdrop = "";
  lastStoryMusicCue = "";
  main.classList.add("is-palace");
  main.classList.toggle("is-homonhon", storyLocation === "homonhon");
  main.classList.toggle("is-docks", storyLocation === "preparations" || storyLocation === "departure");
  main.classList.toggle("is-ocean", storyLocation === "ocean" || storyLocation === "philippines");
  main.classList.toggle("is-entrance", storyLocation === "portugal" && (openingIndex < 4 || openingIndex === palaceLines.length - 1));
  manuelSprite.style.backgroundImage = storyLocation === "spain" ? 'url("assets/charles-expressions.png")' : 'url("assets/manuel-expressions.png")';
  if (storyLocation === "preparations") manuelSprite.style.backgroundImage = 'url("assets/rui-expressions.png")';
  if (storyLocation === "departure") manuelSprite.style.backgroundImage = 'url("assets/pigafetta-expressions.png")';
  magellanFrame = -1;
  manuelFrame = -1;
  menuColumn.hidden = true;
  menuMessage.hidden = true;
  introScreen.hidden = true;
  storyScreen.hidden = false;
  storyScreen.classList.toggle("is-waiting", storyLocation === "philippines");
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
  const chapters = { portugal: palaceLines, spain: spainOpening, preparations: preparationLines, departure: departureLines, homonhon: homonhonOpening };
  if (!chapters[chapter] || transitioning) return;
  document.getElementById("chapters-menu").close();
  continueSavedGame({ location: chapter, lines: chapters[chapter], index: 0 });
});
