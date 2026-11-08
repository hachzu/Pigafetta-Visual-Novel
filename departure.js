"use strict";

const preparationLines = [
  stageDirection("The expedition's preparations begin."),
  magellanLine("I will need five ships and a crew of 270 men."),
  magellanLine("I will also need two years' worth of supplies to feed and sustain this fleet."),
  magellanLine("Artillery will also be needed to defend ourselves from pirates and the Portuguese."),
  stageDirection("Rui Faleiro considers the preparations required."),
  { speaker: "Rui Faleiro", text: "Considering the requirements for your voyage to be successful, it would take at least a year to prepare everything, not even considering the effort needed to acquire it all." },
  { speaker: "Rui Faleiro", text: "Are you prepared to endure the hardship for it?" },
  magellanLine("God willing."),
  stageDirection("The ships are prepared for departure.")
];
const departureLines = [
  stageDirection("Antonio Pigafetta approaches Magellan."),
  { speaker: "Antonio Pigafetta", text: "Captain, I am at your service." },
  magellanLine("Good. I have been waiting for you."),
  { ...magellanLine("Board the Trinidad so that we can begin our departure."), italic: "Trinidad" },
  magellanLine("We will be anchoring at Sanlúcar de Barrameda for about a month to acquire our remaining provisions. Afterward, we shall leave for the Spice Islands."),
  stageDirection("Pigafetta boards the ship."),
  stageDirection("The fleet prepares to depart.")
];

const chapterTitle = document.createElement("div");
chapterTitle.className = "chapter-title";
chapterTitle.hidden = true;
document.getElementById("main-menu").append(chapterTitle);

async function showHarborChapter(locationName, lines, title, sprite) {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fade = reduced ? 0 : 800;
  if (locationName === "preparations") fadePalaceMusic(0, fade);
  transitionLayer.classList.add("is-dark");
  await wait(fade);
  storyScreen.classList.add("is-waiting");
  storyScreen.classList.remove("is-choosing");
  choicePanel.hidden = true;
  const main = document.getElementById("main-menu");
  main.classList.remove("is-entrance", "is-ocean");
  main.classList.add("is-docks");
  storyLocation = locationName;
  playSceneMusic(locationName);
  activeLines = lines;
  openingIndex = 0;
  magellanFrame = -1;
  manuelFrame = -1;
  manuelSprite.style.backgroundImage = `url("assets/${sprite}")`;
  window.classroom?.syncDialogue?.({ speaker: "", text: "", direction: false });
  transitionLayer.classList.remove("is-dark");
  await wait(fade);
  chapterTitle.textContent = title;
  chapterTitle.classList.remove("voyage-copy");
  chapterTitle.style.transitionDuration = "";
  chapterTitle.hidden = false;
  chapterTitle.classList.remove("is-visible");
  void chapterTitle.offsetWidth;
  chapterTitle.classList.add("is-visible");
  await wait(2000);
  chapterTitle.classList.remove("is-visible");
  await wait(reduced ? 0 : 1000);
  chapterTitle.hidden = true;
  await wait(1000);
  renderOpening();
  storyScreen.classList.remove("is-waiting");
  const dialogue = document.querySelector(".dialogue");
  dialogue.classList.remove("dialogue-enter");
  void dialogue.offsetWidth;
  dialogue.classList.add("dialogue-enter");
  transitioning = false;
  nextDialogue.focus({ preventScroll: true });
}
function startSevilleScene() {
  return showHarborChapter("preparations", preparationLines, "Seville, Spain", "rui-expressions.png");
}
function startDepartureScene() {
  return showHarborChapter("departure", departureLines, "THE DEPARTURE", "pigafetta-expressions.png");
}
async function startOceanScene() {
  return startPhilippineArc();
}
for (const path of ["docks.png", "straitoftenerife.png", "rui-expressions.png", "pigafetta-expressions.png"]) {
  const preload = new Image();
  preload.src = `assets/${path}`;
}
