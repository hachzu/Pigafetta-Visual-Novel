"use strict";

const homonhonShipLine = line => ({ ...line, homonhonBackdrop: "ship" });
const homonhonShipDirection = text => ({ ...stageDirection(text), homonhonBackdrop: "ship" });
const homonhonOpening = [
  stageDirection("A tropical island appears."),
  stageDirection("The surviving fleet approaches an island after months of sailing."),
  { choice: true }
];
const homonhonCommon = [
  { ...stageDirection("The fleet anchors near the shore."), homonhonBackdrop: "anchorage" },
  { ...stageDirection("After dinner, a small boat carrying nine natives approaches the fleet."), homonhonBackdrop: "native-boat", musicCue: "native-arrival" },
  { speaker: "Native 1", text: "Hala! Karon lang ko kakita sa inyong klase!", homonhonBackdrop: "native-boat" },
  { speaker: "Native 2", text: "Taga asa mo?", homonhonBackdrop: "native-boat" },
  { ...stageDirection("The natives appear curious and excited."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("Enrique! Translate what they said."), homonhonBackdrop: "native-boat" },
  { speaker: "Enrique of Malacca", text: "Yes, my lord. They said that this is their first time seeing your kind, and they are inquiring as to where you are from. They also seem very happy to see you.", homonhonBackdrop: "native-boat" },
  { ...magellanLine("They seem to be of a reasonable sort."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("Men! Bring them refreshments and receive our guests."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("The crew prepares food and gifts for the visitors."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("We also have red caps, looking glasses, combs, bells, ivory, and other things. Consider these as welcoming gifts."), homonhonBackdrop: "native-boat" },
  { speaker: "Native 2", text: "Maghatag pud mi og mga isda ug uraca para sa inyoha.", homonhonBackdrop: "native-boat" },
  { speaker: "Enrique of Malacca", text: "They are grateful for the gifts, my lord. They also wish to reciprocate by giving us gifts of their own, mainly fish and palm wine. However, they believe that what they have offered pales in comparison to what we have given them. They promise to return in four days with rice, coconuts, and various other items.", homonhonBackdrop: "native-boat" },
  { ...stageDirection("The natives depart."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("Time passes."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("Two balanghais, or large native vessels, approach the Captain-General's ship. A prominent figure accompanied by several attendants stands aboard one of the vessels."), homonhonBackdrop: "native-boat" }
];
const homonhonChoices = [
  { label: "Allow the crew to rest on the island for a while.", lines: [homonhonShipLine(magellanLine("This appears to be an uninhabited island. We shall remain here and rest for the morrow."))] },
  { label: "Immediately move to a different island in search of better provisions.", lines: [homonhonShipLine(magellanLine("We must find an island with sufficient provisions. Perhaps another location would better serve our needs.")), homonhonShipLine({ speaker: "Enrique of Malacca", text: "My lord, we have already endured a considerable journey. Moving to another island so soon may exhaust our remaining supplies." }), homonhonShipLine(magellanLine("Very well. We shall remain here for the time being."))] },
  { label: "Send a small scouting party to investigate the island before allowing the crew to disembark.", lines: [homonhonShipLine(magellanLine("Send a small party ashore. I want to know whether this island is suitable for our needs before the entire crew disembarks.")), homonhonShipLine({ speaker: "Enrique of Malacca", text: "As you command, my lord." }), homonhonShipDirection("The scouting party returns after inspecting the immediate surroundings."), homonhonShipLine(magellanLine("Then we shall remain here and allow the men to recover."))] }
];
async function startHomonhonScene() {
  if (transitioning) return;
  transitioning = true;
  clearTimeout(introTimer);
  introAdvance = null;
  const fade = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500;
  transitionLayer.style.transitionDuration = `${fade}ms`;
  transitionLayer.classList.add("is-dark");
  await new Promise(resolve => setTimeout(resolve, fade));
  chapterTitle.hidden = true;
  chapterTitle.classList.remove("voyage-copy", "is-visible");
  chapterTitle.style.transitionDuration = "";
  const main = document.getElementById("main-menu");
  main.classList.remove("is-ocean", "is-docks", "is-entrance", "is-homonhon-ship", "is-homonhon-anchorage", "is-homonhon-native-boat");
  main.classList.add("is-homonhon");
  homonhonBackdrop = "island";
  lastStoryMusicCue = "";
  storyLocation = "homonhon";
  activeLines = homonhonOpening;
  openingIndex = 0;
  magellanFrame = -1;
  manuelFrame = -1;
  transitionLayer.classList.remove("is-dark");
  await new Promise(resolve => setTimeout(resolve, fade));
  transitionLayer.style.transitionDuration = "";
  storyScreen.classList.remove("is-waiting");
  renderOpening();
  const dialogue = document.querySelector(".dialogue");
  dialogue.classList.remove("dialogue-enter");
  void dialogue.offsetWidth;
  dialogue.classList.add("dialogue-enter");
  transitioning = false;
  nextDialogue.focus({ preventScroll: true });
}
for (const source of ["homonhon.png", "interiorship.png"]) {
  const preload = new Image();
  preload.src = `assets/${source}`;
}
