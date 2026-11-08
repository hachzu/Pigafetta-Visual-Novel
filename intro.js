"use strict";

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
