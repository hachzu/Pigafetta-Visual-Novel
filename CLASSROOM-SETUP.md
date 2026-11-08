# Classroom presentation

1. In Firebase Authentication → Sign-in method, enable **Anonymous**.
2. In Realtime Database → Rules, paste the contents of `database.rules.json` and Publish. These rules leave unrelated database paths closed.
3. Serve these files with GitHub Pages or a local web server (do not open index.html directly as a file). Audience devices need the published URL.
4. Open the top-right menu → Host classroom voting → choose countdown length → Create room. Do this before the choice scene. Creating a room while at the choice scene also starts voting there.
5. Students scan the QR code on the host display to join directly. Click **Enlarge QR code** for a projector-sized view. The code contains the audience URL and room code, so no typing is required. The audience link and manual room-code entry remain available. Host the game on a URL students can reach (such as GitHub Pages), rather than localhost.
6. Start New Game or Continue. When I-02 appears, voting opens automatically. After the countdown, the most-voted branch plays automatically. Ties (including zero votes) wait for the host to click a tied choice.

Each anonymous Firebase account has one current vote for each question and may change that choice until the countdown ends. Its identity persists across reloads and tabs in the same browser. Another browser, private browsing session, or cleared browser data creates another identity; enforcing one physical device or one student requires school sign-in or individual admission codes.

Continue saves the current line and chosen branch locally on the host browser. A refreshed host tab also reconnects to its classroom room. Returning to the main menu keeps the classroom room and any active countdown running; Continue rejoins that same vote/result. Create a new classroom room for a fresh class vote. Rooms expire after about 12 hours.

The current game has one interactive question, I-02. Votes use server-enforced deadlines, one authenticated identity per vote, and host-only round/result updates. Firebase rules must be published before real classroom use. Firebase config is public client configuration; no admin/service-account credentials are used.

Before presenting, test with the projector browser as host and two phones: submit different votes, refresh a phone and confirm it cannot vote again, allow a tie and choose the tiebreak, then test Main Menu → Continue.

References: https://firebase.google.com/docs/auth/web/anonymous-auth and https://firebase.google.com/docs/database/security/rules-conditions
