"use strict";

const voyageNarration = [
  "After anchoring at Sanlúcar de Barrameda for more than a month, the fleet shapes its course southwest, eventually reaching Tenerife in the Canary Islands.",
  "Following its departure from the Canaries, the expedition arrives in Brazil to replenish its provisions and avoid Portuguese interference on its way to the Moluccas.",
  "During a particularly severe storm, the Santiago is wrecked along the Santa Cruz River in South America. Unfortunately for Magellan, this would not be the only misfortune he would encounter during the voyage.",
  "While passing through the strait he discovered, which he named Todos los Santos, a mutiny occurs aboard the San Antonio. The mutineers successfully seize the ship and return to Spain.",
  "The fleet eventually leaves the strait with only three ships remaining.",
  "After crossing the vast Pacific Ocean and making stops along the way, the surviving fleet eventually reaches the Philippine archipelago."
].flatMap(text => text.split(/(?<=[.!?])\s+/)).map(text => ({ speaker: "", text,
  italic: text.includes("Santiago") ? "Santiago" : text.includes("San Antonio") ? "San Antonio" : "" }));

async function startPhilippineArc() {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const fade = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 3000;
  window.classroom?.syncDialogue?.({ speaker: "", text: "", direction: false });
  transitionLayer.style.transitionDuration = `${fade}ms`;
  fadePalaceMusic(0, 3000);
  transitionLayer.classList.add("is-dark");
  await wait(fade);
  playSceneMusic("philippines", true);
  storyScreen.classList.add("is-waiting");
  document.getElementById("main-menu").classList.add("is-ocean");
  chapterTitle.classList.remove("voyage-copy", "is-visible");
  chapterTitle.textContent = "THE PHILIPPINE ARC";
  chapterTitle.hidden = false;
  transitionLayer.classList.remove("is-dark");
  void chapterTitle.offsetWidth;
  chapterTitle.classList.add("is-visible");
  await wait(fade + 3000);
  chapterTitle.classList.remove("is-visible");
  await wait(1000);
  transitionLayer.style.transitionDuration = "";
  storyLocation = "philippines";
  activeLines = voyageNarration;
  openingIndex = 0;
  transitioning = false;
  renderOpening();
}

function renderVoyagePassage() {
  clearTimeout(introTimer);
  storyScreen.classList.add("is-waiting");
  const line = activeLines[openingIndex];
  const fade = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 2000;
  chapterTitle.hidden = false;
  chapterTitle.classList.add("voyage-copy");
  chapterTitle.classList.remove("is-visible");
  chapterTitle.style.transitionDuration = `${fade}ms`;
  paintDialogueText(chapterTitle, line.text, line.italic);
  void chapterTitle.offsetWidth;
  chapterTitle.classList.add("is-visible");
  window.classroom?.syncDialogue?.({ speaker: "", text: line.text, direction: false });
  let fading = false;
  const advance = () => {
    if (fading) return;
    fading = true;
    clearTimeout(introTimer);
    chapterTitle.classList.remove("is-visible");
    introTimer = setTimeout(() => {
      if (openingIndex + 1 < activeLines.length) {
        openingIndex++;
        renderOpening();
      } else {
        chapterTitle.hidden = true;
        chapterTitle.classList.remove("voyage-copy");
        chapterTitle.style.transitionDuration = "";
        introAdvance = null;
        window.classroom?.syncDialogue?.({ speaker: "", text: "", direction: false });
        startHomonhonScene();
      }
    }, fade);
  };
  introAdvance = advance;
  introTimer = setTimeout(advance, fade + 3000);
}
chapterTitle.addEventListener("click", () => {
  if (storyLocation === "philippines" && !transitioning) introAdvance?.();
});
