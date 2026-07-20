// AUTO LOGOUT AFTER 5 MINUTES INACTIVITY
let logoutTimer;

function autoLogout() {
    // Session aur local storage clean up
    sessionStorage.removeItem("deccan_admin_session");
    localStorage.removeItem("deccan_admin_session");

    if (typeof firebase !== "undefined" && firebase.auth) {
        // Firebase Auth se sign out bina kisi alert popup ke
        firebase.auth().signOut().then(() => {
            // Direct bina kisi notification/alert ke login page par redirection
            window.location.replace("panel-entry-a7q2m8.html");
        }).catch(() => {
            window.location.replace("panel-entry-a7q2m8.html");
        });
    } else {
        window.location.replace("panel-entry-a7q2m8.html");
    }
}

function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => {
        autoLogout();
    }, 5 * 60 * 1000); // 5 Minutes
}

// User Activity Events
[
 "click",
 "mousemove",
 "keypress",
 "scroll",
 "touchstart"
].forEach(event => {
    document.addEventListener(event, resetLogoutTimer);
});

// Start Timer
resetLogoutTimer();
