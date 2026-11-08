# The Magellan Expedition: Through Pigafetta's Eyes

A static, GitHub Pages-ready visual novel about Antonio Pigafetta and Magellan's expedition. Plain HTML, CSS, and browser JavaScript: no bundler, framework, or package install. Built for classroom projection: the host runs the game and the audience joins on their phones to follow the dialogue and vote at decision points.

## Working rules

- Keep changes small and in scope. Do not replace the game with a generic visual-novel template.
- Preserve existing work and unrelated changes.
- Run `node tests/classroom.test.mjs` after changing story flow, saving, choices, or classroom voting.
- Keep the app deployable by opening `index.html` on GitHub Pages. Use relative asset paths only.
- Never commit Firebase admin keys, service-account files, passwords, or private tokens. The public client config lives at the top of `firebase-client.js`.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Main menu, dialogue markup, chapter dialog, script loading order. |
| `style.css` | All menu, dialogue, sprite, choice, audience, and scene background styling. |
| `engine.js` | Shared story engine (typing, transitions, sprites, audio, menu) plus pause menu, save/Continue, and chapter jump. |
| `story.js` | All scene content: Valladolid and the shared choice panel, Seville, The Departure, Philippine Arc, Homonhon, and the opening prologue. |
| `classroom.js` | Host room, QR code, Firebase voting, timers, tie-breaking, dialogue sync. |
| `vote-core.js` | `tally()` vote counting (kept separate so it can be imported by tests). |
| `audience.html` / `audience.js` | Audience phone view: synced dialogue and voting. |
| `firebase-client.js` | Firebase config and client setup. |
| `database.rules.json` | Realtime Database rules to publish in Firebase. |
| `qrcode.js` | Third-party QR generator (MIT, Kazuhiko Arase). |

Script order in `index.html` matters: `engine.js`, then `story.js`, then `qrcode.js`, then `classroom.js`. The first three are classic scripts sharing globals. `classroom.js` is an ES module; do not turn the others into modules without updating their shared global usage. `qrcode.js` is loaded before `classroom.js` because the module uses `window.qrcode` when it restores a previous room on load.

## Visual direction

- 2D, flat, imperfect hand-drawn historical illustrations. Broad matte colors, sparse lines, soft painterly shapes.
- Avoid photorealism, glossy or metallic surfaces, 3D rendering, heavy texture, dense ornament, shine gradients, and overly perfect geometry.
- New backgrounds: wide 16:9 with a clear lower area for the dialogue box.
- Sprites: transparent, hip-up, three-frame horizontal expression sheet (attentive, talking, expressive). Magellan is always on the right, facing into the scene.

## Story engine conventions

- A dialogue line is normally `{ speaker, text }`.
- `stageDirection("...")` for italic parenthesized action; `magellanLine("...")` for Magellan's dialogue.
- `activeLines`, `openingIndex`, and `storyLocation` hold live story state. Call `renderOpening()` after changing them.
- `renderOpening()` saves automatically, syncs the audience dialogue, sets the speaker, runs typing, and updates sprites.
- Clicking during typing completes the text; clicking again advances. Do not bypass this.
- For a choice checkpoint, put `{ choice: true }` in the scene's lines. `showSpainChoices()` is the shared choice UI despite its name. Extend `currentChoiceSet()` when adding another choice scene.
- Choice branches must rejoin a shared common sequence unless the narrative needs permanent branching.

## Scene and sprite behavior

- Scene switches must fade through `#scene-transition`; never swap backgrounds visibly mid-scene.
- Portugal uses `setPalaceBackdrop()`. Homonhon uses `setHomonhonBackdrop()` and a line's `homonhonBackdrop` (`ship`, `anchorage`, `native-boat`).
- Homonhon starts on `assets/homonhon.png`, moves to `assets/interiorship.png` after the audience choice, then uses `assets/shore.png` from "The fleet anchors near the shore" through the end of the current native encounter.
- On Homonhon, Magellan stays hidden until his first spoken line; the secondary slot stays hidden because native and Enrique sprites do not exist yet.
- A sprite pops only at the start of its owner's spoken line. No continuous mouth flapping.

## Audio

- Music is managed by the `palaceMusic` audio object in `engine.js` (legacy name).
- `playSceneMusic()` picks the score for Portugal, Seville, or the Philippine Arc.
- One-off transitions use a line's `musicCue` with `playStoryMusicCue()`. "After dinner, a small boat carrying nine natives approaches the fleet." has `musicCue: "native-arrival"`, fading out the Philippine score and fading in `music/Kevin Penkin - Line.mp3`.
- Browser audio needs an initial user gesture. Keep the "Click to start" interaction.
- URL-encode spaces and special characters in music paths in JavaScript.

## Classroom voting

### Setup

1. In Firebase Authentication → Sign-in method, enable **Anonymous**.
2. In Realtime Database → Rules, paste `database.rules.json` and Publish. Unrelated paths stay closed.
3. Serve the files with GitHub Pages or a local web server (do not open `index.html` as a file). Audience devices need the published URL, not localhost.
4. Top-right menu → Host classroom voting → choose countdown length → Create room. Do this before the choice scene; creating a room at a choice scene also starts voting there.
5. Students scan the QR code on the host display (**Enlarge QR code** for a projector-sized view). It contains the audience URL and room code. The audience link and manual six-digit code entry remain available.
6. Start New Game or Continue. When a choice appears, voting opens automatically. After the countdown, the most-voted branch plays. Ties (including zero votes) wait for the host to click a tied choice. If no audience is connected, the host chooses directly.

### Behavior

- Each anonymous Firebase account has one current vote per question and may change it until the countdown ends. Identity persists across reloads and tabs in the same browser; another browser, private window, or cleared data is a new identity. Enforcing one device or student per vote needs school sign-in or individual admission codes.
- Votes use server-enforced deadlines, one authenticated identity per vote, and host-only round/result updates.
- Continue saves the current line and chosen branch locally on the host browser. A refreshed host tab reconnects to its room. Returning to the main menu keeps the room and any active countdown running. Rooms expire after about 12 hours.
- After a resolved choice, the audience page returns to: "Voting will appear here! Please keep an eye on the projector". Audience members see only synced dialogue, the prompt, choices, and the timer/status.
- The current game has two voting rounds: I-02 (Spain) and II-01 (Homonhon).
- If database behavior changes, update `database.rules.json` alongside the client code and republish the rules in Firebase.

### Test before presenting

Use the projector browser as host and two phones: submit different votes, refresh a phone and confirm it cannot vote again, force a tie and choose the tiebreak, then test Main Menu → Continue.

References: https://firebase.google.com/docs/auth/web/anonymous-auth and https://firebase.google.com/docs/database/security/rules-conditions

## Timeline

1. Main menu → cinematic introduction → Lisbon, Portugal.
2. Valladolid, Spain: choice I-02.
3. Seville preparations → The Departure → Philippine Arc voyage montage.
4. Homonhon Island: choice II-01.
5. Content currently ends at the approaching balanghais stage direction. Continue from there.

## Assets

- Backgrounds and sprites are in `assets/`; music is in `music/`.
- `assets/generation-notes.md` records prompts for generated art. Add an entry for any new AI imagery.
- Do not overwrite existing artwork unless asked. Use descriptive sibling filenames for revisions.

## Before handoff

1. Test the affected chapter from the Chapters menu and through normal progression.
2. Confirm save + Continue restore the same line, background, cast, and active choice branch.
3. If a choice changed, test all branches and a host/audience voting round.
4. Run `node tests/classroom.test.mjs` and report the result.