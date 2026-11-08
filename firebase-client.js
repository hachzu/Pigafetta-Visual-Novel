import { firebaseConfig } from "./firebase-config.js";
export async function connectFirebase() {
  const url = firebaseConfig.databaseURL || localStorage.getItem("pigafetta-database-url");
  if (!url) throw new Error("Add the Realtime Database URL first.");
  const base = "https://www.gstatic.com/firebasejs/13.2.0/";
  const [appSDK, authSDK, dbSDK] = await Promise.all([
    import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-database.js")
  ]);
  const app = appSDK.getApps()[0] || appSDK.initializeApp({ ...firebaseConfig, databaseURL: url });
  const auth = authSDK.getAuth(app);
  await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);
  await auth.authStateReady();
  const user = auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
  const db = dbSDK.getDatabase(app);
  let offset = 0;
  let connected = false;
  dbSDK.onValue(dbSDK.ref(db, ".info/serverTimeOffset"), snap => { offset = snap.val() || 0; });
  dbSDK.onValue(dbSDK.ref(db, ".info/connected"), snap => { connected = snap.val() === true; });
  return { ...dbSDK, db, uid: user.uid, now: () => Date.now() + offset, online: () => connected };
}
