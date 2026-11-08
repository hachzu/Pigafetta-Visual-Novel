"use strict";

// All scene content, in the original load order:
// Valladolid (spain.js) -> Seville/Departure (departure.js) -> Philippine Arc (philippines.js)
// -> Homonhon (homonhon.js) -> Opening prologue (intro.js).
// Requires engine.js to be loaded first.

// ===== Valladolid, Spain + shared choice panel =====

const magellanLine = text => ({ speaker: "Ferdinand Magellan", text });
const charlesLine = text => ({ speaker: "King Charles I", text });
const stageDirection = text => ({ speaker: "", text: `(${text})`, direction: true });
const spainOpening = [
  { speaker: "Narration", text: "A second chance has arrived. Having been rejected by the Portuguese Crown, Magellan now seeks the support of Spain." },
  stageDirection("Magellan stands before King Charles I."),
  { choice: true }
];
const spainCommon = [
  stageDirection("Magellan continues explaining the political and economic advantages of the voyage."),
  magellanLine("Furthermore, according to the Treaty of Tordesillas, the Moluccas do in fact fall within Spain's claimed sphere of influence."),
  magellanLine("Upon the successful completion of this voyage, Your Majesty could break the Portuguese hold on the Spice Islands and bring abundant wealth to the Spanish Crown."),
  { ...stageDirection("King Charles makes his decision."), pleased: true },
  charlesLine("Yes, I am very satisfied. Give me an account of what this voyage needs, and I will see to it that it shall be provided."),
  { ...stageDirection("Magellan bows before the King."), pleased: true }
];
const spainChoices = [
  { label: "Exaggerate the certainty of your proposed western passage.", lines: [
    magellanLine("Your Majesty, I assure you that a western passage to the Moluccas exists. The route is within our reach, and I am confident that my expedition shall discover it."),
    charlesLine("You speak with considerable certainty, Captain. What makes you so confident in this proposed route?"),
    magellanLine("The possibility of such a passage is sufficient reason to undertake the journey, Your Majesty."),
    stageDirection("The King considers Magellan's confidence.")
  ] },
  { label: "Logically map out the incentives and potential benefits of the voyage.", lines: [
    magellanLine("Your Majesty, I have studied the available geographical information and devised a plan that could secure a western sea route to the Spice Islands."),
    charlesLine("I see. Tell me more about this proposition."),
    magellanLine("Through this route, Spain could gain direct access to the Moluccas and challenge Portugal's dominance over the spice trade."),
    stageDirection("The King listens carefully to the proposal.")
  ] },
  { label: "Appeal to the King's ambition to challenge Portuguese dominance over the spice trade.", lines: [
    magellanLine("Your Majesty, Portugal has long enjoyed considerable control over the spice trade. Spain, however, need not remain dependent on Portuguese maritime routes."),
    charlesLine("You propose that Spain establish its own route to the East Indies?"),
    magellanLine("Precisely, Your Majesty. Such an undertaking could greatly increase the wealth and influence of the Spanish Crown."),
    stageDirection("The King appears interested in the potential benefits.")
  ] }
];

const choicePanel = document.createElement("section");
choicePanel.className = "story-choices";
choicePanel.setAttribute("aria-label", "How will you plead with the King of Spain?");
choicePanel.hidden = true;
storyScreen.prepend(choicePanel);
let choiceSelectionOpen = false;
function currentChoiceSet() {
  return storyLocation === "limasawa"
    ? { id: "II-02", question: "Will you introduce Christianity to the inhabitants?", choices: limasawaChoices, common: limasawaCommon }
    : storyLocation === "homonhon"
    ? { id: "II-01", question: "How will you respond to the discovery?", choices: homonhonChoices, common: homonhonCommon }
    : { id: "I-02", question: "How will you plead with the King of Spain?", choices: spainChoices, common: spainCommon };
}

function showSpainChoices() {
  choiceSelectionOpen = true;
  storyScreen.classList.add("is-choosing");
  isTyping = false;
  nextDialogue.disabled = true;
  dialoguePanel.classList.remove("is-ready");
  speakerElement.hidden = true;
  const text = document.getElementById("dialogue-text");
  text.classList.remove("is-direction");
  const selection = currentChoiceSet();
  text.textContent = selection.question;
  choicePanel.setAttribute("aria-label", selection.question);
  choicePanel.dataset.prompt = text.textContent;
  window.classroom?.syncDialogue?.({ speaker: "", text: text.textContent, direction: false });
  choicePanel.replaceChildren();
  if (window.classroom?.isHost()) {
    choicePanel.hidden = false;
    window.classroom.openVote(choicePanel, selection.choices, selectSpainChoice, selection.id, selection.question);
    return;
  }
  selection.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      selectSpainChoice(index);
    });
    choicePanel.append(button);
  });
  choicePanel.hidden = false;
  choicePanel.querySelector("button").focus({ preventScroll: true });
}

function selectSpainChoice(index) {
  const selection = currentChoiceSet();
  if (!choiceSelectionOpen || !activeLines[openingIndex]?.choice || !selection.choices[index]) return;
  choiceSelectionOpen = false;
  storyScreen.classList.remove("is-choosing");
  choicePanel.hidden = true;
  activeLines = [...selection.choices[index].lines, ...selection.common];
  openingIndex = 0;
  renderOpening();
  nextDialogue.focus({ preventScroll: true });
}

async function startSpainScene() {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const fade = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  transitionLayer.classList.add("is-dark");
  await wait(fade);
  storyScreen.hidden = true;
  introScreen.hidden = false;
  introScreen.classList.add("is-location");
  introCopy.textContent = "Valladolid, Spain";
  playDrumStrike();
  // Reveal the location title suddenly, as in Lisbon.
  transitionLayer.style.transition = "none";
  transitionLayer.classList.remove("is-dark");
  void transitionLayer.offsetWidth;
  transitionLayer.style.transition = "";
  let enterCourt;
  const locationClick = () => enterCourt();
  let entered = false;
  let locationTimer;
  enterCourt = async () => {
    if (entered) return;
    entered = true;
    clearTimeout(locationTimer);
    introScreen.removeEventListener("click", locationClick);
    transitionLayer.classList.add("is-dark");
    await wait(fade);
    storyLocation = "spain";
    activeLines = spainOpening;
    openingIndex = 0;
    magellanFrame = -1;
    manuelFrame = -1;
    manuelSprite.style.backgroundImage = 'url("assets/charles-expressions.png")';
    manuelSprite.hidden = false;
    document.getElementById("main-menu").classList.remove("is-entrance");
    introScreen.hidden = true;
    introScreen.classList.remove("is-location");
    introCopy.replaceChildren();
    storyScreen.hidden = false;
    storyScreen.classList.add("is-waiting");
    transitionLayer.classList.remove("is-dark");
    await wait(fade + 3000);
    renderOpening();
    storyScreen.classList.remove("is-waiting");
    const dialogue = document.querySelector(".dialogue");
    dialogue.classList.remove("dialogue-enter");
    void dialogue.offsetWidth;
    dialogue.classList.add("dialogue-enter");
    transitioning = false;
    nextDialogue.focus({ preventScroll: true });
  };
  introScreen.addEventListener("click", locationClick);
  locationTimer = setTimeout(enterCourt, 1800);
}

// Warm the transparent sprite sheet before the court reveal.
const charlesPreload = new Image();
charlesPreload.src = "assets/charles-expressions.png";

// ===== Seville preparations + The Departure =====

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

// ===== The Philippine Arc (voyage narration) =====

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

// ===== Homonhon Island =====

const homonhonShipLine = line => ({ ...line, homonhonBackdrop: "ship" });
const homonhonShipDirection = text => ({ ...stageDirection(text), homonhonBackdrop: "ship" });
const homonhonOpening = [
  stageDirection("A tropical island appears."),
  stageDirection("The surviving fleet approaches an island after months of sailing."),
  { choice: true }
];
const homonhonCommon = [
  { ...stageDirection("The fleet anchors near the shore."), homonhonBackdrop: "anchorage", with: "none" },
  { ...stageDirection("After dinner, a small boat carrying nine natives approaches the fleet."), homonhonBackdrop: "native-boat", musicCue: "native-arrival" },
  { speaker: "Native 1", text: "Hala! Karon lang ko kakita sa inyong klase!", homonhonBackdrop: "native-boat" },
  { speaker: "Native 2", text: "Taga asa mo?", homonhonBackdrop: "native-boat" },
  { ...stageDirection("The natives appear curious and excited."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("Enrique! Translate what they said."), homonhonBackdrop: "native-boat", with: "enrique" },
  { speaker: "Enrique of Malacca", text: "Yes, my lord. They said that this is their first time seeing your kind, and they are inquiring as to where you are from. They also seem very happy to see you.", homonhonBackdrop: "native-boat" },
  { ...magellanLine("They seem to be of a reasonable sort."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("Men! Bring them refreshments and receive our guests."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("The crew prepares food and gifts for the visitors."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("We also have red caps, looking glasses, combs, bells, ivory, and other things. Consider these as welcoming gifts."), homonhonBackdrop: "native-boat", with: "natives" },
  { speaker: "Native 2", text: "Maghatag pud mi og mga isda ug uraca para sa inyoha.", homonhonBackdrop: "native-boat" },
  { speaker: "Enrique of Malacca", text: "They are grateful for the gifts, my lord. They also wish to reciprocate by giving us gifts of their own, mainly fish and palm wine. However, they believe that what they have offered pales in comparison to what we have given them. They promise to return in four days with rice, coconuts, and various other items.", homonhonBackdrop: "native-boat" },
  { ...stageDirection("The natives depart."), homonhonBackdrop: "native-boat", with: "none" },
  { ...stageDirection("Time passes."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("Two balanghais, or large native vessels, approach the Captain-General's ship. A prominent figure accompanied by several attendants stands aboard one of the vessels."), homonhonBackdrop: "native-boat" },
  { ...magellanLine("Enrique, ask them if they have ever seen European armaments being used before."), homonhonBackdrop: "native-boat", with: "enrique" },
  { speaker: "Enrique of Malacca", text: "Kumusta, Rajah? Nakakita na ba kamo sa mga armas sa mga Europeo nga gigamit?", homonhonBackdrop: "native-boat" },
  { speaker: "Rajah Calambu", text: "Hindi pa ako nakasaksi sa mga armas na tinutukoy mo.", homonhonBackdrop: "native-boat" },
  { ...magellanLine("I see. They have not yet learned what God has blessed us with. We shall host a demonstration for them."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("Magellan gathers several of his men, who dress in full steel armor and perform a demonstration involving their iron swords."), homonhonBackdrop: "native-boat" },
  { speaker: "Rajah Calambu", text: "Napakagaling! Ang isang tauhan mo ay katumbas ng isang daan ng mandirigma ko!", homonhonBackdrop: "native-boat" },
  { speaker: "Enrique of Malacca", text: "He said that the demonstration was impressive, my lord. He claims that one of your men is equivalent to a hundred of his warriors.", homonhonBackdrop: "native-boat" },
  { ...magellanLine("I am no king. I am simply a humble seafarer seeking to befriend you all through the grace of our loving God."), homonhonBackdrop: "native-boat" },
  { ...stageDirection("The two parties continue exchanging gifts."), homonhonBackdrop: "native-boat" }
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
  leftCast = "";
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
for (const source of ["homonhon.png", "interiorship.png", "enrique-expressions-square.png", "natives-expressions-square.png"]) {
  const preload = new Image();
  preload.src = `assets/${source}`;
}

// ===== Limasawa Island =====

const enriqueLine = text => ({ speaker: "Enrique of Malacca", text });
const calambuLine = text => ({ speaker: "Rajah Calambu", text });
const limasawaOpening = [
  stageDirection("Preparations for Easter Mass begin."),
  { choice: true }
];
const limasawaCommon = [
  { ...stageDirection("The Rajahs arrive to observe the ceremony."), with: "calambu" },
  magellanLine("We have come early ashore to celebrate Mass."),
  calambuLine("Ano ba itong Mass na itinutukoy mo?"),
  enriqueLine("My lord, the Rajah is asking what a Mass is."),
  magellanLine("A Mass is where we join together to praise Almighty God."),
  magellanLine("Why not join us in the coming Mass?"),
  calambuLine("Sang-ayon kami sa inyong paanyaya para sa Mass. Ngunit sino ba itong Bathala na inyong tinutukoy?"),
  enriqueLine("My lord, the Rajahs are asking who God is."),
  magellanLine("God Almighty is the reason why we are still alive and here to partake in what this land has to offer."),
  { ...stageDirection("Father Pedro de Valderrama begins the communion."), with: "none" },
  stageDirection("The congregation participates in the Eucharistic celebration."),
  stageDirection("The Mass concludes."),
  { ...stageDirection("Magellan approaches the Rajahs carrying a cross adorned with a crown and nails."), with: "calambu" },
  magellanLine("This cross, adorned with a crown, symbolizes our Lord. We pray before it so that He may hear our prayers."),
  magellanLine("Will you grant me permission to lay this holy cross upon the summit of the mountain? If the cross were to be erected here, my brethren will recognize that I have been here and that this land has received our faith."),
  calambuLine("Maaari mo itong gawin."),
  { ...stageDirection("Magellan and his men carry the cross to the summit and plant it upon the mountain."), with: "none", cg: true }
];
const limasawaChoices = [
  { label: "Refrain from introducing Christianity and allow the inhabitants to maintain their existing beliefs.", lines: [
    magellanLine("We have come to celebrate Easter, but I shall not impose our customs upon those who have not expressed an interest in them."),
    enriqueLine("Shall I inform the Rajahs that the ceremony is intended for our men alone, my lord?"),
    magellanLine("Yes. They may observe if they wish, but they are under no obligation to participate.")
  ] },
  { label: "Invite the local rulers to participate in the Easter Mass.", lines: [
    magellanLine("We have come ashore to celebrate the holy feast of Easter. Let us invite the Rajahs to join us in the Mass.")
  ] },
  { label: "Explain the significance of Christianity to the local rulers before inviting them to attend.", lines: [
    magellanLine("Before inviting them, we should explain the significance of this celebration. They must understand what they are being invited to witness."),
    enriqueLine("I shall explain it to them, my lord.")
  ] }
];
async function startLimasawaScene() {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fade = reduced ? 0 : 1500;
  transitionLayer.style.transitionDuration = `${fade}ms`;
  fadePalaceMusic(0, Math.max(fade, 1));
  transitionLayer.classList.add("is-dark");
  await wait(fade);
  // Hide the old dialogue and sprites while the screen is black, then reveal the new shore first.
  storyScreen.classList.add("is-waiting");
  window.classroom?.syncDialogue?.({ speaker: "", text: "", direction: false });
  const main = document.getElementById("main-menu");
  main.classList.remove("is-homonhon", "is-homonhon-ship", "is-homonhon-anchorage", "is-homonhon-native-boat");
  main.classList.add("is-limasawa");
  main.classList.remove("is-limasawa-cg");
  storyScreen.classList.remove("is-cg");
  limasawaCg = false;
  playSceneMusic("limasawa", true);
  homonhonBackdrop = "";
  leftCast = "";
  storyLocation = "limasawa";
  activeLines = limasawaOpening;
  openingIndex = 0;
  magellanFrame = -1;
  manuelFrame = -1;
  transitionLayer.classList.remove("is-dark");
  await wait(fade);
  transitionLayer.style.transitionDuration = "";
  // Location title in the center of the screen, as in Seville.
  chapterTitle.textContent = "Limasawa, Philippines";
  chapterTitle.classList.remove("voyage-copy", "is-visible");
  chapterTitle.style.transitionDuration = "";
  chapterTitle.hidden = false;
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

// Transition card: the fleet leaves Limasawa for Cebu. Art goes in assets/fleet-departs-cebu.png.
// Cebu content is not written yet, so afterwards this returns to the main menu like any chapter end.
async function startCebuTransition() {
  if (transitioning) return;
  transitioning = true;
  clearInterval(typingTimer);
  clearTimeout(backdropTimer);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const fade = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 2000;
  window.classroom?.syncDialogue?.({ speaker: "", text: "The fleet departs for Cebu.", direction: false });
  transitionLayer.style.transitionDuration = `${fade}ms`;
  transitionLayer.classList.add("is-dark");
  await wait(fade);
  storyScreen.classList.add("is-waiting");
  const main = document.getElementById("main-menu");
  main.classList.remove("is-limasawa", "is-limasawa-cg");
  storyScreen.classList.remove("is-cg");
  limasawaCg = false;
  main.classList.add("is-departs-cebu");
  chapterTitle.classList.remove("voyage-copy", "is-visible");
  chapterTitle.textContent = "The fleet departs for Cebu.";
  chapterTitle.hidden = false;
  transitionLayer.classList.remove("is-dark");
  void chapterTitle.offsetWidth;
  chapterTitle.classList.add("is-visible");
  await wait(fade + 4000);
  chapterTitle.classList.remove("is-visible");
  await wait(1000);
  chapterTitle.hidden = true;
  transitionLayer.style.transitionDuration = "";
  window.classroom?.syncDialogue?.({ speaker: "", text: "", direction: false });
  transitioning = false;
  fadePalaceMusic(0, 1800);
  changeScene(false);
}
for (const source of ["limasawashore.png", "CGCROSS.png", "fleet-departs-cebu.png"]) {
  const preload = new Image();
  preload.src = `assets/${source}`;
}

// ===== Opening historical prologue =====

const introductionParagraphs = [
  "It is the year 1519, and <strong>Portugal</strong> maintains a monopoly over the maritime route to the <em>Spice Islands</em>.",
  "<strong>Spain</strong>, seeking to challenge Portuguese dominance, desires direct access to the <em>Moluccas</em> to acquire spices that could be traded for immense profits.",
  "Enter <strong>Ferdinand Magellan</strong>, a Portuguese maritime veteran driven by <em>wealth, fame, and power</em>. With considerable experience in seafaring and previous military expeditions, he seeks an opportunity to lead a voyage that would establish his name in history.",
  "However, before his expedition can begin, he must first secure the support of a <strong>monarch</strong> willing to finance his ambitions."
];
const introScreen = document.getElementById("intro-screen");
const introStart = document.getElementById("intro-start");
const introCopy = document.querySelector(".intro-copy");
const introMusic = new Audio("music/Kevin%20Penkin%20-%20%E6%BB%91%E8%90%BD%E4%BA%AD.mp3");
introMusic.loop = true;
introMusic.preload = "auto";
introMusic.volume = 0;
let musicFadeTimer = 0;
function fadeMusic(target, duration = 1400) {
  clearInterval(musicFadeTimer);
  const start = introMusic.volume;
  const steps = Math.max(1, Math.round(duration / 40));
  let step = 0;
  musicFadeTimer = setInterval(() => {
    step++;
    introMusic.volume = Math.max(0, Math.min(1, start + (target - start) * step / steps));
    if (step >= steps) {
      clearInterval(musicFadeTimer);
      if (target === 0) introMusic.pause();
    }
  }, 40);
}
async function startIntroduction() {
  if (transitioning) return;
  transitionLayer.classList.add("is-dark");
  const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
  await new Promise(resolve => setTimeout(resolve, delay));
  menuColumn.hidden = true;
  menuMessage.hidden = true;
  introScreen.hidden = false;
  storyScreen.hidden = true;
  introStart.focus({ preventScroll: true });
  transitionLayer.classList.remove("is-dark");
}
function startIntroductionMusic() {
  introMusic.currentTime = 0;
  introMusic.volume = 0;
  introMusic.play().then(() => fadeMusic(.32, 1800)).catch(() => {
    introStart.textContent = "Click to start · music unavailable";
  });
}
let introTimer = 0;
let introAdvance = null;
function runIntroduction() {
  introStart.disabled = true;
  introStart.classList.add("is-gone");
  startIntroductionMusic();
  const motionDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
  const sentences = introductionParagraphs.flatMap(paragraph => paragraph.split(/(?<=[.!?])\s+/));
  const introLines = sentences.map(paragraph => {
    const line = document.createElement("p");
    line.innerHTML = paragraph;
    line.className = "intro-paragraph";
    introCopy.append(line);
    return line;
  });
  const normalFadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 2000;
  const finalFadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 5000;
  let index = -1;
  function nextPassage() {
    clearTimeout(introTimer);
    introLines.forEach(line => { line.classList.remove("is-visible"); line.hidden = true; });
    index++;
    if (index >= introLines.length) { showLocation(); return; }
    const line = introLines[index];
    line.hidden = false;
    void line.offsetWidth;
    line.classList.add("is-visible");
    introTimer = setTimeout(() => {
      const outDuration = index === introLines.length - 1 ? finalFadeDuration : normalFadeDuration;
      line.style.transitionDuration = `${outDuration}ms`;
      line.classList.remove("is-visible");
      introTimer = setTimeout(nextPassage, outDuration);
    }, normalFadeDuration + 3000);
  }
  async function enterPalace() {
    clearTimeout(introTimer);
    introAdvance = null;
    // Keep the location card on screen until the black cover is complete.
    transitionLayer.classList.add("is-dark");
    const fadeDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
    await new Promise(resolve => setTimeout(resolve, fadeDuration));
    introScreen.hidden = true;
    introScreen.classList.remove("is-location");
    introCopy.replaceChildren();
    startPalaceScene();
    introStart.disabled = false;
    introStart.classList.remove("is-gone");
  }
  function showLocation() {
    fadeMusic(0, 4200);
    introCopy.replaceChildren();
    introScreen.classList.add("is-location");
    introCopy.textContent = "Lisbon, Portugal";
    playDrumStrike();
    introAdvance = enterPalace;
    introTimer = setTimeout(enterPalace, 1800);
  }
  introAdvance = nextPassage;
  introTimer = setTimeout(nextPassage, motionDuration);
}
introStart.addEventListener("click", event => { event.stopPropagation(); runIntroduction(); });
introScreen.addEventListener("click", () => { if (introAdvance) introAdvance(); });