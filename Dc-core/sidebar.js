document.addEventListener("DOMContentLoaded", function () {
    // 1. Current Page Auto Detection
    const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";

    const pageTitles = {
    "dashboard.html": "DASHBOARD",
    "players-desk.html": "PLAYERS DESK",
    "games-arena.html": "GAMES ARENA",
    "bids-pool.html": "BIDS POOL",
    "declare-result.html": "DECLARE RESULT",
    "winning-history.html": "WINNING HISTORY",
    "deposit-ledger.html": "DEPOSIT LEDGER",
    "payout-control.html": "PAYOUT CONTROL",
    "finance-control.html": "FINANCE CONTROL",
    "chat-support.html": "CHAT SUPPORT",
    "notifications.html": "NOTIFICATIONS",
    "reward-code.html": "REWARD CODE MATRIX",
    "app-control.html": "APP CONTROL & SECURITY",
    "master-security.html": "MASTER SECURITY"
};

    const dynamicTitle = pageTitles[currentPath] || "DECCAN PANEL";

    // 2. Dynamic Header & Sidebar Layout Injection
    const layoutHTML = `
        <header class="universal-header">
            <div class="top-navbar">
                <div class="left-nav-box">
                    <button class="action-btn btn-menu" id="toggleSidebarBtn" aria-label="Toggle Menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h1 class="page-title" id="pageTitleText">${dynamicTitle}</h1>
                </div>
                <div class="right-nav-box">
                    <div class="dragon-container">
                        <span class="dragon-fixed-emoji">🐺</span>
                    </div>
                </div>
            </div>
        </header>

        <div class="sidebar-overlay" id="sidebarOverlay"></div>
        <aside class="sidebar" id="mainSidebar">
            <div class="sidebar-brand">
                <span class="brand-text">DECCAN PANEL</span>
            </div>
            <nav class="sidebar-menu">
                <a href="dashboard.html" class="menu-item"><i class="fa-solid fa-chart-pie"></i> <span>Dashboard</span></a>
                <a href="players-desk.html" class="menu-item"><i class="fa-solid fa-users-gear"></i> <span>Players Desk</span></a>
                <a href="games-arena.html" class="menu-item"><i class="fa-solid fa-dice"></i> <span>Games Arena</span></a>
                <a href="declare-result.html" class="menu-item"><i class="fa-solid fa-chart-simple"></i> <span>Declare Result</span></a>
                <a href="winning-history.html" class="menu-item"><i class="fa-solid fa-trophy"></i> <span>Winning History</span></a>
                <a href="deposit-ledger.html" class="menu-item"><i class="fa-solid fa-money-bill-transfer"></i> <span>Deposit Ledger</span></a>
                <a href="payout-control.html" class="menu-item"><i class="fa-solid fa-money-bill-wave"></i> <span>Payout Control</span></a>
                <a href="finance-control.html" class="menu-item"><i class="fa-solid fa-scale-balanced"></i> <span>Finance Control</span></a>
                <a href="chat-support.html" class="menu-item"><i class="fa-solid fa-headset"></i> <span>Chat Support</span></a>
                <a href="notifications.html" class="menu-item"><i class="fa-solid fa-bell"></i> <span>Notifications</span></a>
                <a href="reward-code.html" class="menu-item"><i class="fa-solid fa-gem"></i> <span>Reward Code Matrix</span></a>
                <a href="app-control.html" class="menu-item"><i class="fa-solid fa-shield-halved"></i> <span>App Control & Security</span></a>
                <a href="master-security.html" class="menu-item"><i class="fa-solid fa-user-shield"></i> <span>Master Security</span></a>
            </nav>
        </aside>

        <div id="globalChatAlertBanner" style="display:none; position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:99999; background:#FFC107; color:#000; padding:12px 20px; border-radius:10px; font-weight:bold; box-shadow:0 10px 25px rgba(0,0,0,0.5); cursor:pointer; font-size:14px; text-align:center; border:2px solid #fff; width:90%; max-width:400px;">
            🚨 UNATTENDED CHAT TICKET WAITING! <br>
            <span style="font-size:12px; font-weight:normal;">Tap here to open Chat Support Desk</span>
        </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', layoutHTML);

    // 3. Highlight Active Menu
    const menuLinks = document.querySelectorAll(".sidebar-menu .menu-item");
    let pageFound = false;
    menuLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
            pageFound = true;
        }
    });
    if (!pageFound && menuLinks.length > 0) menuLinks[0].classList.add("active");

    // 4. Sidebar Toggle Listeners
    const toggleBtn = document.getElementById("toggleSidebarBtn");
    const overlay = document.getElementById("sidebarOverlay");
    const sidebar = document.getElementById("mainSidebar");

    function toggleSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.toggle("open");
            overlay.classList.toggle("active");
            document.body.classList.toggle("sidebar-open");
        }
    }
    if (toggleBtn) toggleBtn.addEventListener("click", toggleSidebar);
    if (overlay) overlay.addEventListener("click", toggleSidebar);

    // =========================================================================
    // 5. SECURE & RELIABLE AUDIO & NOTIFICATION SYSTEM
    // =========================================================================
    const ticketAlertSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    ticketAlertSound.preload = "auto";
    let isAudioUnlocked = false;

    // सिर्फ पहली बार क्लिक होने पर ऑडियो को ब्राउज़र पॉलिसी के तहत साइलेंटली अनलॉक करेगा
    const unlockAudioOnce = () => {
        if (!isAudioUnlocked) {
            ticketAlertSound.play().then(() => {
                ticketAlertSound.pause();
                ticketAlertSound.currentTime = 0;
                isAudioUnlocked = true;
            }).catch(e => console.log("Audio unlock deferred:", e));

            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }

            document.removeEventListener("click", unlockAudioOnce);
            document.removeEventListener("touchstart", unlockAudioOnce);
        }
    };
    document.addEventListener("click", unlockAudioOnce);
    document.addEventListener("touchstart", unlockAudioOnce);

    // केवल नया टिकट आने पर ही यह फंक्शन कॉल होगा
    function playTicketAlertSound() {
        try {
            ticketAlertSound.currentTime = 0;
            ticketAlertSound.play().catch(e => console.log("Play blocked:", e));
        } catch (e) {
            console.log("Audio play error:", e);
        }
    }

    // Banner click action
    const alertBanner = document.getElementById("globalChatAlertBanner");
    if(alertBanner) {
        alertBanner.addEventListener("click", function() {
            window.location.href = "chat-support.html";
        });
    }

    // =========================================================================
    // 6. REALTIME CHAT MONITOR & SYSTEM PUSH NOTIFICATION (FIREBASE)
    // =========================================================================
    let isInitialLoad = true;

    function listenForLiveTickets() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            const db = firebase.firestore();

            db.collection("support_tickets")
                .where("status", "==", "Open")
                .onSnapshot((snapshot) => {
                    const openCount = snapshot.size;

                    // पहली बार लोड होने पर पुराना डेटा मिलने पर आवाज़ नहीं बजेगी
                    if (isInitialLoad) {
                        isInitialLoad = false;
                        if (openCount > 0 && alertBanner) {
                            alertBanner.style.display = "block";
                            alertBanner.innerHTML = `🚨 ACTIVE CHAT (${openCount} OPEN)<br><span style="font-size:12px;">Click to open Chat Support</span>`;
                        }
                        return;
                    }

                    if (openCount > 0) {
                        if (alertBanner) {
                            alertBanner.style.display = "block";
                            alertBanner.innerHTML = `🚨 ACTIVE CHAT (${openCount} OPEN)<br><span style="font-size:12px;">Click to open Chat Support</span>`;
                        }
                    } else {
                        if (alertBanner) {
                            alertBanner.style.display = "none";
                        }
                    }

                    // केवल तभी आवाज़ और पुश नोटिफिकेशन आएगा जब कोई नया टिकट (Added) जोड़ा जाएगा
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            const latestTicket = change.doc.data();
                            const playerName = latestTicket.userName || latestTicket.name || 'Player';

                            // 1. प्ले साउंड केवल नए टिकट पर
                            playTicketAlertSound();

                            // 2. सिस्टम पुश नोटिफिकेशन
                            if ("Notification" in window && Notification.permission === "granted") {
                                const systemNotif = new Notification("🔥 DECCAN PANEL SUPPORT", {
                                    body: `🚨 NEW SUPPORT CHAT: ${playerName} sent a ticket!`,
                                    icon: "https://cdn-icons-png.flaticon.com/512/8943/8943377.png",
                                    tag: "chat-support-alert"
                                });

                                systemNotif.onclick = function() {
                                    window.focus();
                                    window.location.href = "chat-support.html";
                                };
                            }
                        }
                    });

                }, (error) => {
                    console.error("Chat Watcher Error:", error);
                });
        } else {
            setTimeout(listenForLiveTickets, 500);
        }
    }

    listenForLiveTickets();
});
