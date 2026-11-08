"use strict";

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

function showSpainChoices() {
  choiceSelectionOpen = true;
  storyScreen.classList.add("is-choosing");
  isTyping = false;
  nextDialogue.disabled = true;
  dialoguePanel.classList.remove("is-ready");
  speakerElement.hidden = true;
  const text = document.getElementById("dialogue-text");
  text.classList.remove("is-direction");
  text.textContent = "How will you plead with the King of Spain?";
  choicePanel.dataset.prompt = text.textContent;
  window.classroom?.syncDialogue?.({ speaker: "", text: text.textContent, direction: false });
  choicePanel.replaceChildren();
  if (window.classroom?.isHost()) {
    choicePanel.hidden = false;
    window.classroom.openVote(choicePanel, spainChoices, selectSpainChoice);
    return;
  }
  spainChoices.forEach((choice, index) => {
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
  if (!choiceSelectionOpen || !activeLines[openingIndex]?.choice || !spainChoices[index]) return;
  choiceSelectionOpen = false;
  storyScreen.classList.remove("is-choosing");
  choicePanel.hidden = true;
  activeLines = [...spainChoices[index].lines, ...spainCommon];
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
