// =========================================================================
// AUTO LOGOUT AFTER 5 MINUTES INACTIVITY (OPTIMIZED & BULLETPROOF)
// =========================================================================
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 Minutes in Milliseconds
let logoutTimer;
let lastActivityTime = Date.now();

function autoLogout() {
    // 1. Session Storage & Local Storage Clean up
    sessionStorage.removeItem("deccan_admin_session");
    localStorage.removeItem("deccan_admin_session");

    // 2. Firebase Auth SignOut (Silent Logout)
    if (typeof firebase !== "undefined" && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.replace("panel-entry-a7q2m8.html");
        }).catch(() => {
            window.location.replace("panel-entry-a7q2m8.html");
        });
    } else {
        window.location.replace("panel-entry-a7q2m8.html");
    }
}

// टाइमर रीसेट करने का सुरक्षित तरीका (Throttled Reset)
function resetLogoutTimer() {
    const currentTime = Date.now();
    
    // केवल तब अपडेट करो जब कम से कम 2 सेकंड का गैप हो (अनावश्यक रीसेट से बचाने के लिए)
    if (currentTime - lastActivityTime > 2000) {
        lastActivityTime = currentTime;
    }

    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => {
        // चेक करें कि क्या वाकई 5 मिनट तक कोई एक्टिविटी नहीं हुई
        if (Date.now() - lastActivityTime >= INACTIVITY_LIMIT) {
            autoLogout();
        } else {
            resetLogoutTimer();
        }
    }, INACTIVITY_LIMIT);
}

// User Activity Events (केवल काम के इवेंट्स)
["click", "keydown", "scroll", "touchstart"].forEach(event => {
    document.addEventListener(event, resetLogoutTimer, { passive: true });
});

// जब यूज़र दूसरे टैब से वापस इस एडमिन पैनल वाले टैब पर आए तो टाइम चेक करें
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        if (Date.now() - lastActivityTime >= INACTIVITY_LIMIT) {
            autoLogout();
        } else {
            resetLogoutTimer();
        }
    }
});

// Initialize Timer
resetLogoutTimer();
