"use strict";

// ===== Voice acting =====
// One clip per voiced line, named by its script ID and stored in voice/ (for example voice/[VA2-001].mp3).
// Mixed file types are fine: each clip is tried with every extension in VOICE_EXTENSIONS, in order.
// Keep the list of available clips in sync with the files in voice/ to avoid requests for missing clips.
// Lines are matched by their exact text, so saved games and branches work without changing story.js.
// If a line's text is edited, update its entry here; a line with no match simply plays silently.
//
// Music ducking: the story music drops while a clip is playing and comes back the moment the clip ends,
// is skipped, fails to load, or voice acting is switched off. The actual volume changes live in engine.js
// (setVoiceMusicDucked); this file only says when speech starts and stops.
const VOICE_FOLDER = "voice/";
const VOICE_EXTENSIONS = [".mp3", ".m4a", ".wav"];
const VOICE_PREF_KEY = "pigafetta-voice";

const VOICE_CLIPS = new Set([
  "VA1-001", "VA1-002", "VA1-003", "VA1-004", "VA1-005", "VA1-006", "VA1-007", "VA1-008", "VA1-009",
  "VA1-010", "VA1-011", "VA1-012", "VA1-013", "VA1-014", "VA1-015", "VA1-016", "VA1-017", "VA1-018",
  "VA3-001", "VA3-002", "VA3-003", "VA3-004", "VA3-005", "VA3-006", "VA3-007", "VA3-008", "VA3-009", "VA3-010","VA3-011",
  "VA2-001", "VA2-003", "VA2-004", "VA2-005", "VA2-006", "VA2-007", "VA2-008", "VA2-009", "VA2-010",
  "VA2-011", "VA2-012", "VA2-013", "VA2-014", "VA2-015", "VA2-016", "VA2-017", "VA2-018", "VA2-019", "VA2-020",
  "VA2-021", "VA2-022", "VA2-023", "VA2-024", "VA2-025", "VA2-026", "VA2-027", "VA2-028", "VA2-029", "VA2-030",
  "VA2-031", "VA2-032", "VA2-033", "VA2-034", "VA2-035", "VA2-036", "VA2-037", "VA2-038", "VA2-039", "VA2-040",
  "VA2-041", "VA2-042", "VA2-043", "VA2-044", "VA2-045", "VA2-046", "VA2-047", "VA2-048", "VA2-049",
  "VA4-001", "VA4-002", "VA4-003", "VA4-004", "VA4-005", "VA4-006", "VA4-007",
  "VA5-001", "VA5-002", "LAPU-LAPU"
]);

const VOICE_LINES = {
  "VA2-001": "Your Majesty! Please, I humbly request an audience!",
  "VA2-002": "I kiss Your Majesty's hands and offer my most faithful respects.",
  "VA2-003": "I propose that I spearhead a voyage to search for a western sea route towards the Moluccas. In doing so, Portugal could bolster its control over the islands and strengthen its grip on the flow of spices.",
  "VA2-004": "Your Majesty, I assure you that a western passage to the Moluccas exists. The route is within our reach, and I am confident that my expedition shall discover it.",
  "VA4-001": "You speak with considerable certainty, Captain. What makes you so confident in this proposed route?",
  "VA2-005": "The possibility of such a passage is sufficient reason to undertake the journey, Your Majesty.",
  "VA2-006": "Your Majesty, I have studied the available geographical information and devised a plan that could secure a western sea route to the Spice Islands.",
  "VA4-002": "I see. Tell me more about this proposition.",
  "VA2-007": "Through this route, Spain could gain direct access to the Moluccas and challenge Portugal's dominance over the spice trade.",
  "VA2-008": "Your Majesty, Portugal has long enjoyed considerable control over the spice trade. Spain, however, need not remain dependent on Portuguese maritime routes.",
  "VA4-003": "You propose that Spain establish its own route to the East Indies?",
  "VA2-009": "Precisely, Your Majesty. Such an undertaking could greatly increase the wealth and influence of the Spanish Crown.",
  "VA2-010": "Furthermore, according to the Treaty of Tordesillas, the Moluccas do in fact fall within Spain's claimed sphere of influence.",
  "VA2-011": "Upon the successful completion of this voyage, Your Majesty could break the Portuguese hold on the Spice Islands and bring abundant wealth to the Spanish Crown.",
  "VA4-004": "Yes, I am very satisfied. Give me an account of what this voyage needs, and I will see to it that it shall be provided.",
  "VA2-012": "I will need five ships and a crew of 270 men.",
  "VA2-013": "I will also need two years' worth of supplies to feed and sustain this fleet.",
  "VA2-014": "Artillery will also be needed to defend ourselves from pirates and the Portuguese.",
  "VA2-015": "God willing.",
  "VA1-001": "Captain, I am at your service.",
  "VA2-016": "Good. I have been waiting for you.",
  "VA2-017": "Board the Trinidad so that we can begin our departure.",
  "VA2-018": "We will be anchoring at Sanlúcar de Barrameda for about a month to acquire our remaining provisions. Afterward, we shall leave for the Spice Islands.",
  "VA2-019": "This appears to be an uninhabited island. We shall remain here and rest for the morrow.",
  "VA2-020": "We must find an island with sufficient provisions. Perhaps another location would better serve our needs.",
  "VA3-001": "My lord, we have already endured a considerable journey. Moving to another island so soon may exhaust our remaining supplies.",
  "VA2-021": "Very well. We shall remain here for the time being.",
  "VA2-022": "Send a small party ashore. I want to know whether this island is suitable for our needs before the entire crew disembarks.",
  "VA3-002": "As you command, my lord.",
  "VA2-023": "Then we shall remain here and allow the men to recover.",
  "VA2-024": "Enrique! Translate what they said.",
  "VA3-003": "Yes, my lord. They said that this is their first time seeing your kind, and they are inquiring as to where you are from. They also seem very happy to see you.",
  "VA2-025": "They seem to be of a reasonable sort.",
  "VA2-026": "Men! Bring them refreshments and receive our guests.",
  "VA2-027": "We also have red caps, looking glasses, combs, bells, ivory, and other things. Consider these as welcoming gifts.",
  "VA3-004": "They are grateful for the gifts, my lord. They also wish to reciprocate by giving us gifts of their own, mainly fish and palm wine. However, they believe that what they have offered pales in comparison to what we have given them. They promise to return in four days with rice, coconuts, and various other items.",
  "VA2-028": "Enrique, ask them if they have ever seen European armaments being used before.",
  "VA3-005": "Kumusta, Rajah? Nakakita na ba kamo sa mga armas sa mga Europeo nga gigamit?",
  "VA2-029": "I see. They have not yet learned what God has blessed us with. We shall host a demonstration for them.",
  "VA3-006": "He said that the demonstration was impressive, my lord. He claims that one of your men is equivalent to a hundred of his warriors.",
  "VA2-030": "I am no king. I am simply a humble seafarer seeking to befriend you all through the grace of our loving God.",
  "VA2-031": "We have come to celebrate Easter, but I shall not impose our customs upon those who have not expressed an interest in them.",
  "VA3-007": "Shall I inform the Rajahs that the ceremony is intended for our men alone, my lord?",
  "VA2-032": "Yes. They may observe if they wish, but they are under no obligation to participate.",
  "VA2-033": "We have come ashore to celebrate the holy feast of Easter. Let us invite the Rajahs to join us in the Mass.",
  "VA2-034": "Before inviting them, we should explain the significance of this celebration. They must understand what they are being invited to witness.",
  "VA3-008": "I shall explain it to them, my lord.",
  "VA2-035": "We have come early ashore to celebrate Mass.",
  "VA3-009": "My lord, the Rajah is asking what a Mass is.",
  "VA2-036": "A Mass is where we join together to praise Almighty God.",
  "VA2-037": "Why not join us in the coming Mass?",
  "VA3-010": "My lord, the Rajahs are asking who God is.",
  "VA2-038": "God Almighty is the reason why we are still alive and here to partake in what this land has to offer.",
  "VA2-039": "This cross, adorned with a crown, symbolizes our Lord. We pray before it so that He may hear our prayers.",
  "VA2-040": "Will you grant me permission to lay this holy cross upon the summit of the mountain? If the cross were to be erected here, my brethren will recognize that I have been here and that this land has received our faith.",
  "VA2-041": "We have no reason to pay tribute to a ruler who has yet to recognize the authority of the Spanish Crown.",
  "VA2-042": "We came here for spices and peaceful trade. It would be unwise to provoke unnecessary hostility over a customary harbor tribute.",
  "VA2-043": "We must establish a favorable relationship with the Rajah. However, we should not promise military assistance without understanding the circumstances of his conflict.",
  "VA2-044": "Enrique, tell their ruler we come in peace, but the Crown of Spain bows to no earthly king.",
  "VA4-005": "Isang sasakyan mula sa Siam ang nagbayad ng buwis apat na araw pa lamang ang nakalilipas. Lahat ng nakikipagkalakalan sa Zzubu ay nagbabayad ng buwis. Ngunit ang iyong panginoon ay nagsasalita nang may labis na kapalaluan.",
  "VA2-045": "Gladly shall we share blood as brothers! But true unity comes from God above, who created heaven and earth. We ask you to embrace our faith, not out of fear of our steel, but from your own free will.",
  "VA3-011": "Ang sabi ng Kapitan, ang kanilang Diyos ang lumikha ng langit at lupa. Nais niyang ibahagi ang kanilang pananampalataya, ngunit hindi sa pamamagitan ng takot o dahas, kundi sa sarili ninyong kagustuhan.",
  "VA4-006": "Kung tatanggapin namin ang inyong Diyos at ang inyong Hari, ipagtatanggol ba kami ng inyong mga tauhang nakabihis-bakal laban sa aming mga kalabang tumatangging sumunod?",
  "VA2-046": "Say the word, Don Carlos! With our guns and armor, one of my men is worth a hundred of theirs. I shall force your enemies into submission!",
  "VA4-007": "Isinusuko ko ang aking mga lumang diyus-diyosang kahoy sa mga apoy. Mula sa araw na ito, tawagin ninyo akong Don Carlos ng Zzubu!",
  "VA5-001": "Karon, magsugod ang bag-ong panahon para sa among mga tawo. Hinaot nga magdala kini og kalinaw.",
  "VA2-047": "Your Highness, take this Holy Child Jesus. Let Him replace your former idols and keep Him as a guardian over you and your people.",
  "VA5-002": "Salamat kaayo, Kapitan. Dawaton nako kini ug ampingan.",
  "VA1-002": "After establishing relations with Rajah Humabon, our Captain-General sought to extend his influence over the neighboring islands. However, one chieftain, Lapu-Lapu of Mactan, refused to recognize the authority of the Spanish Crown.",
  "VA1-003": "Despite the warnings of his companions, Magellan resolved to lead an expedition against the island's inhabitants.",
  "VA2-048": "Men! Advance!",
  "VA1-004": "Our weapons and armor, which had previously inspired fear among the inhabitants we encountered, proved insufficient against the warriors of Mactan. The shallow waters prevented our ships from providing effective support, and our men struggled to advance through the unfamiliar terrain.",
  "VA2-049": "Retreat! Protect the others!",
  "VA1-005": "Our Captain-General had fallen. The man who had led us across the vast Pacific Ocean had met his end upon the shores of Mactan.",
  "VA1-006": "After the death of our Captain-General, we attempted to preserve the friendship we had established with the ruler of Cebu. Rajah Humabon invited several of our men to a banquet, promising gifts and continued cooperation.",
  "VA1-007": "What appeared to be an ordinary gathering would soon become another tragedy for our expedition.",
  "VA1-008": "The banquet had been a trap. Many of our companions perished, including Duarte Barbosa, who had assumed command following Magellan's death.",
  "VA1-009": "With our numbers diminished and our trust in the inhabitants shattered, we could no longer remain in Cebu. We were forced to abandon the island and continue our journey.",
  "VA1-010": "After leaving Cebu, we continued westward toward Borneo. There, we encountered the Sultanate of Brunei, a prosperous kingdom with an established trading network and considerable wealth.",
  "VA1-011": "The kingdom possessed an abundance of valuable goods and maintained relations with merchants from various parts of Asia. Our encounter provided further evidence of the immense wealth that could be found throughout the East Indies.",
  "VA1-012": "At long last, we reached the Spice Islands. The very destination that had inspired our expedition was finally within our grasp.",
  "VA1-013": "We were received by the Sultan of Tidore. Here, we found the precious cloves that had motivated our journey across the world's oceans.",
  "VA1-014": "Our expedition had reached its destination, but the journey was far from over. The Victoria, commanded by Juan Sebastián Elcano, would undertake the perilous return voyage across the Indian Ocean and around the Cape of Good Hope.",
  "VA1-015": "The voyage was marked by hunger, exhaustion, and the constant threat of Portuguese interception. Nevertheless, our remaining crew pressed onward.",
  "VA1-016": "On September 6, 1522, the Victoria returned to Spain. Of the five ships and approximately 270 men who departed with us, only one ship and eighteen men completed the circumnavigation.",
  "VA1-017": "Ferdinand Magellan did not live to witness the completion of the expedition he had envisioned. Nevertheless, his undertaking had demonstrated that the Earth could be circumnavigated by sea.",
  "VA1-018": "We departed in search of spices, wealth, and a western passage to the East Indies. We returned with something far greater: proof of a journey that would forever change humanity's understanding of the world.",
  "LAPU-LAPU": "Umalis na kayo sa aming lupain!"
};

const voiceIdByText = new Map(Object.entries(VOICE_LINES).map(([id, text]) => [text, id]));
const voiceClips = new Map();
let voiceEntry = null;
let voiceOn = true;
try { voiceOn = localStorage.getItem(VOICE_PREF_KEY) !== "off"; } catch { /* default to on */ }

// Music ducking hooks (the volume work happens in engine.js and story.js).
function duckMusic() {
  window.setVoiceMusicDucked?.(true);
  window.setIntroMusicVoiceDucked?.(true);
}
function releaseMusic() {
  window.setVoiceMusicDucked?.(false);
  window.setIntroMusicVoiceDucked?.(false);
}

// Each entry holds the clip for one line. If its file is missing, the next extension is tried.
function loadVoiceExtension(entry, index) {
  const fileName = entry.id === "LAPU-LAPU" ? entry.id : `[${entry.id}]`;
  const audio = new Audio(`${VOICE_FOLDER}${fileName}${VOICE_EXTENSIONS[index]}`);
  audio.preload = "auto";
  entry.audio = audio;
  // The clip finished by itself: bring the music back up without waiting for the player's next click.
  audio.addEventListener("ended", () => {
    if (voiceEntry === entry && entry.audio === audio) releaseMusic();
  });
  audio.addEventListener("error", () => {
    if (entry.audio !== audio) return;
    if (index + 1 < VOICE_EXTENSIONS.length) {
      loadVoiceExtension(entry, index + 1);
      if (voiceEntry === entry) startVoice(entry); // the line is on screen now, so retry right away
    } else {
      entry.failed = true; // no file under any extension: this line stays silent
      if (voiceEntry === entry) releaseMusic(); // nobody is speaking, so the music must not stay ducked
    }
  });
}

function voiceClipFor(id) {
  let entry = voiceClips.get(id);
  if (!entry) {
    entry = { id, audio: null, failed: false };
    voiceClips.set(id, entry);
    loadVoiceExtension(entry, 0);
  }
  return entry;
}

function startVoice(entry) {
  if (entry.failed) { if (voiceEntry === entry) releaseMusic(); return; }
  const audio = entry.audio;
  try { audio.currentTime = 0; } catch { /* clip not loaded yet */ }
  audio.play().then(() => {
    if (voiceEntry !== entry || entry.audio !== audio) return;
    duckMusic();
  }).catch(() => {
    // A missing file or blocked audio must never stop the story, and must never leave the music ducked.
    // (If the file was swapped for the next extension, the retry takes over, so stay out of its way.)
    if (voiceEntry === entry && entry.audio === audio) releaseMusic();
  });
}

// keepDucked: the next line is also voiced, so leave the music ducked instead of letting it swell for an instant.
function stopVoice(keepDucked = false) {
  if (voiceEntry) {
    voiceEntry.audio.pause();
    try { voiceEntry.audio.currentTime = 0; } catch { /* clip not loaded yet */ }
  }
  voiceEntry = null;
  if (!keepDucked) releaseMusic();
}

// Plays the line's clip (if it has one) and warms up the next line's clip so it starts without delay.
function playVoice(line, nextLine) {
  const id = voiceOn ? voiceIdByText.get(line?.text) : undefined;
  const hasClip = Boolean(id && VOICE_CLIPS.has(id));
  stopVoice(hasClip);
  if (!voiceOn) return;
  const nextId = voiceIdByText.get(nextLine?.text);
  if (nextId && VOICE_CLIPS.has(nextId)) voiceClipFor(nextId);
  if (!hasClip) return;
  voiceEntry = voiceClipFor(id);
  startVoice(voiceEntry);
}

window.voice = { play: playVoice, stop: () => stopVoice(), currentAudio: () => voiceEntry?.audio || null };

const voiceToggle = document.getElementById("voice-toggle");
function paintVoiceToggle() {
  if (!voiceToggle) return;
  voiceToggle.textContent = `Voice acting: ${voiceOn ? "On" : "Off"}`;
  voiceToggle.setAttribute("aria-pressed", String(voiceOn));
}
voiceToggle?.addEventListener("click", () => {
  voiceOn = !voiceOn;
  try { localStorage.setItem(VOICE_PREF_KEY, voiceOn ? "on" : "off"); } catch { /* preference just won't persist */ }
  if (!voiceOn) stopVoice();
  paintVoiceToggle();
});
paintVoiceToggle();
