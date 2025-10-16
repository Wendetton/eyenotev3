// src/lib/firebaseWebTV.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";

// Configurações do SEU app de TV (do seu repo webtv-main/utils/firebase.js)
const tvFirebaseConfig = {
  apiKey: "AIzaSyCYdjRgOv7A_OK2oMy5o3gGDxW-mn0ID54",
  authDomain: "webtv-ee904.firebaseapp.com",
  projectId: "webtv-ee904",
  storageBucket: "webtv-ee904.appspot.com",
  messagingSenderId: "657754370553",
  appId: "1:657754370553:web:2184cc792b71ef5e8b0d28",
};

// Evita reinicializar em hot-reload
function getOrInitTVApp() {
  const existing = getApps().find(a => a.options.projectId === tvFirebaseConfig.projectId);
  return existing || initializeApp(tvFirebaseConfig, "webtv-ee904");
}

const tvApp = getOrInitTVApp();
export const tvDb = getFirestore(tvApp);
export { serverTimestamp };
