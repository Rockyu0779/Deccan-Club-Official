// session.js - Firebase v10 Modular Session Engine

import { db } from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function checkSession(callback) {
    const mobile = localStorage.getItem("deccan_session_user");
    let uid = localStorage.getItem("deccan_uid");

    if (!mobile) {
        logoutSession();
        return;
    }

    if (uid) {
        getDoc(doc(db, "user-management", uid))
            .then((docSnap) => {
                if (docSnap.exists()) {
                    callback({ uid, mobile });
                } else {
                    executeFallbackLookup(mobile, callback);
                }
            })
            .catch((err) => {
                console.error("Session Check Error:", err);
                callback({ uid, mobile });
            });
    } else {
        executeFallbackLookup(mobile, callback);
    }
}

function executeFallbackLookup(mobile, callback) {
    const q = query(
        collection(db, "user-management"),
        where("mobileNumber", "==", mobile)
    );

    getDocs(q)
        .then((snap) => {
            if (!snap.empty) {
                const userDoc = snap.docs[0];

                localStorage.setItem("deccan_uid", userDoc.id);

                callback({
                    uid: userDoc.id,
                    mobile: mobile
                });
            } else {
                logoutSession();
            }
        })
        .catch((err) => {
            console.error("Fallback Lookup Error:", err);

            const uid = localStorage.getItem("deccan_uid");

            if (uid) {
                callback({
                    uid,
                    mobile
                });
            } else {
                logoutSession();
            }
        });
}

function logoutSession() {
    localStorage.removeItem("deccan_uid");
    localStorage.removeItem("deccan_session_user");
    localStorage.removeItem("deccan_session_name");

    window.location.replace("login.html");
}

// Agar kisi aur file ko checkSession chahiye ho
window.checkSession = checkSession;

// Auto Session Verification
(function () {
    const currentUrl = window.location.pathname;

    if (
        currentUrl.includes("login.html") ||
        currentUrl.includes("register.html")
    ) {
        return;
    }

    checkSession((userState) => {
        console.log("✅ Session Verified:", userState.mobile);
    });
})();