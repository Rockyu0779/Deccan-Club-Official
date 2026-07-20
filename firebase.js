import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnOtH9lPEapTk7z64HbZ0PQgw6O8tNi-A",
  authDomain: "deccan-club-official.firebaseapp.com",
  projectId: "deccan-club-official",
  storageBucket: "deccan-club-official.firebasestorage.app",
  messagingSenderId: "61787320782",
  appId: "1:61787320782:web:18629bfae6ff064e107b9f"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let messaging = null;
try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn("Messaging not supported.");
}

export { app, auth, db, storage, messaging };

// Global bridge
window.firebaseApp = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.messaging = messaging;

console.log("Firebase initialized successfully.");