import { db } from "./firebase.js";
import {
    collection,
    doc,
    setDoc,
    addDoc,
    getDoc,
    onSnapshot,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// External Presets Import
import { CHAT_TREE } from "./presets.js";

// ==========================================
// ☁️ CLOUDINARY CONFIGURATION
// ==========================================
const CLOUDINARY_CLOUD_NAME = "jznsz3ec";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

// Global LocalStorage Fallbacks
let ACTIVE_UID = localStorage.getItem("deccan_uid") || "";
let ACTIVE_PHONE = localStorage.getItem("deccan_session_user") || "";
let ACTIVE_NAME = localStorage.getItem("deccan_session_name") || "Member";

// State Management Tokens
let selectedCategory = "";
let selectedSubCategory = "";
let activeLiveTicketId = null;
let isViewingHistoryTicket = false; 
let liveSnapshotUnsubscribe = null;
let liveTicketDataUnsubscribe = null;
let liveHistoryUnsubscribe = null;
let liveSettingsUnsubscribe = null;
let hasActiveUnresolvedTicket = false;
let ongoingUnresolvedTicketId = "";

window.liveDepositFooter = "Loading live instructions...";
window.liveWithdrawalFooter = "Loading live guidelines...";
window.liveWithdrawalTiming = "Loading timings...";

// ⚡ UI CONCURRENCY & LOCK CONTROL
let isMessageSendingInProgress = false;
let isActionLocked = false;
let pendingImageFile = null; 

// ==========================================
// 🚀 CLOUDINARY IMAGE UPLOAD SERVICE
// ==========================================
async function uploadToCloudinary(file) {
    if (!file) return "";
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            console.error("Cloudinary error:", data);
            showPremiumToast("Image upload failed! Sending without image...");
            return "";
        }
    } catch (err) {
        console.error("Cloudinary exception:", err);
        showPremiumToast("Network error uploading image!");
        return "";
    }
}

// 👑 RENDER ENGINE: Auto Scroll
function triggerSmoothScroll() {
    const workspace = document.getElementById("aiChatWorkspace");
    if (!workspace) return;
    
    workspace.style.setProperty("overflow-y", "auto", "important");
    workspace.style.setProperty("-webkit-overflow-scrolling", "touch", "important");

    setTimeout(() => {
        workspace.scrollTo({
            top: workspace.scrollHeight,
            behavior: "smooth"
        });
    }, 50);
}

// Dynamic Session Verification Engine
async function verifyUserSessionIntegrity() {
    const sessionUser = localStorage.getItem("deccan_session_user");
    if (!sessionUser) {
        window.location.href = "login.html";
        return;
    }

    const cachedBalance = localStorage.getItem("cachedBalance");
    if (cachedBalance) {
        const pillEl = document.getElementById("headerWalletBlock");
        if (pillEl) {
            pillEl.innerHTML = `<i class="fa-solid fa-wallet"></i><span>₹${Number(cachedBalance).toLocaleString('en-IN')}</span>`;
        }
    }

    try {
        const q = query(collection(db, "user-management"), where("mobileNumber", "==", sessionUser));
        onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                
                ACTIVE_UID = userData.uid || userDoc.id;
                ACTIVE_PHONE = userData.mobileNumber || sessionUser;
                ACTIVE_NAME = userData.fullName || userData.username || "Member";

                localStorage.setItem("deccan_uid", ACTIVE_UID);
                localStorage.setItem("deccan_session_name", ACTIVE_NAME);
                
                const accountBalance = Number(userData.accountBalance || 0);
                localStorage.setItem("cachedBalance", accountBalance);
                const pillEl = document.getElementById("headerWalletBlock");
                if (pillEl) {
                    pillEl.innerHTML = `<i class="fa-solid fa-wallet"></i><span>₹${accountBalance.toLocaleString('en-IN')}</span>`;
                }

                checkActiveTicketsConcurrencyGuard();
                syncBotRulesWithWalletDatabase();
            } else {
                checkActiveTicketsConcurrencyGuard();
            }
        });
    } catch (err) {
        startAiSupportWelcomeNode();
    }
}

// ==========================================
// 🎯 UI EVENT BINDING & FILE PICKER ATTACH
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("headerBackBtn")?.addEventListener("click", goBack);
    document.getElementById("tabAiChat")?.addEventListener("click", () => {
        isViewingHistoryTicket = false;
        switchTab('ai_chat');
    });
    document.getElementById("tabHistory")?.addEventListener("click", () => {
        isViewingHistoryTicket = false;
        switchTab('history');
    });

    const attachBtn = document.getElementById("attachFileBtn");
    const fileEngine = document.getElementById("chatFileEngine");

    if (attachBtn) {
        attachBtn.style.setProperty('display', 'flex', 'important');
        attachBtn.addEventListener("click", () => {
            if (isMessageSendingInProgress) return;
            if (fileEngine) fileEngine.click();
        });
    }

    if (fileEngine) {
        fileEngine.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                pendingImageFile = file;
                showImagePreviewShard(file);
                fileEngine.disabled = true;
            }
        });
    }

    document.getElementById("sendPayloadBtn")?.addEventListener("click", handleSendButtonClick);
    verifyUserSessionIntegrity();
});

// Image Preview UI Handler
function showImagePreviewShard(file) {
    let previewShard = document.getElementById("localImagePreviewShard");
    
    if (!previewShard) {
        previewShard = document.createElement("div");
        previewShard.id = "localImagePreviewShard";
        previewShard.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.08);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 12px;
            color: var(--accent-gold);
        `;
        const footerInput = document.getElementById("chatFooterInput");
        footerInput.parentNode.insertBefore(previewShard, footerInput);
    }

    previewShard.style.setProperty('display', 'flex', 'important');
    previewShard.innerHTML = `
        <span><i class="fa-solid fa-paperclip"></i> ${file.name.substring(0, 18)}...</span>
        <i class="fa-solid fa-xmark" id="removeImageBtn" style="cursor:pointer; color:#ef4444; font-size:14px;"></i>
    `;

    document.getElementById("removeImageBtn").addEventListener("click", clearSelectedImage);
}

function clearSelectedImage() {
    pendingImageFile = null;
    const fileEngine = document.getElementById("chatFileEngine");
    if (fileEngine) {
        fileEngine.value = "";
        fileEngine.disabled = false;
    }
    
    const previewShard = document.getElementById("localImagePreviewShard");
    if (previewShard) previewShard.style.setProperty('display', 'none', 'important');
}

function showPremiumToast(msg) {
    const toast = document.getElementById("customToastBox");
    if (!toast) return;
    document.getElementById("customToastText").innerText = msg;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// ⚡ PERSISTENCE ENGINE: Active unresolved tickets lock logic
function checkActiveTicketsConcurrencyGuard() {
    if(!db || !ACTIVE_UID) return;
    
    const q = query(collection(db, "support_tickets"), where("uid", "==", ACTIVE_UID));
    
    onSnapshot(q, (snapshot) => {
        hasActiveUnresolvedTicket = false;
        ongoingUnresolvedTicketId = "";
        let isCurrentlyActiveTicketClosed = false;

        snapshot.forEach((docSnap) => {
            const ticket = docSnap.data();
            if (ticket.status === "Open" || ticket.status === "Working") {
                hasActiveUnresolvedTicket = true;
                ongoingUnresolvedTicketId = ticket.ticketId;
            }
            if (activeLiveTicketId && ticket.ticketId === activeLiveTicketId && ticket.status === "Closed") {
                isCurrentlyActiveTicketClosed = true;
            }
        });

        if (isCurrentlyActiveTicketClosed) {
            showPremiumToast("Yeh ticket close ho chuka hai.");
            activeLiveTicketId = null;
            isViewingHistoryTicket = false;
            document.getElementById('tabBar').style.display = 'flex';
            startAiSupportWelcomeNode();
            return;
        }

        if (hasActiveUnresolvedTicket) {
            if (!activeLiveTicketId && !isViewingHistoryTicket) {
                renderRestrictionBanner(ongoingUnresolvedTicketId);
                streamLiveTicketChatWorkspace(ongoingUnresolvedTicketId);
            }
        } else if (!activeLiveTicketId && !isViewingHistoryTicket) {
            startAiSupportWelcomeNode();
        }
    }, (error) => {
        console.error("Concurrency Guard Snapshot Sync Error:", error);
    });
}

function renderRestrictionBanner(ticketId) {
    document.getElementById('lockBannerZone').innerHTML = `
        <div class="active-ticket-banner">
            <div>⚠️ <strong>Active Ticket Link (${ticketId})</strong><br>Naya ticket block hai jab tak ye resolve nahi hota.</div>
        </div>`;
    triggerSmoothScroll();
}

function startAiSupportWelcomeNode() {
    if (hasActiveUnresolvedTicket && ongoingUnresolvedTicketId) {
        renderRestrictionBanner(ongoingUnresolvedTicketId);
        streamLiveTicketChatWorkspace(ongoingUnresolvedTicketId);
        return;
    }

    selectedCategory = ""; selectedSubCategory = ""; isActionLocked = false;
    document.getElementById('chatFooterInput').style.setProperty('display', 'flex', 'important');
    document.getElementById('lockBannerZone').innerHTML = "";
    const workspace = document.getElementById("aiChatWorkspace");
    workspace.innerHTML = ""; 
    
    appendSystemBubble(`Welcome, <b>${ACTIVE_NAME}</b>. How can Deccan AI Desk assist you today?`);
    
    const optContainer = document.createElement("div");
    optContainer.className = "bubble system";
    optContainer.innerHTML = `
        <b>Choose Problem Category:</b>
        <div class="options-container">
            <button class="option-btn" id="optDeposit">💰 &nbsp; Deposit</button>
            <button class="option-btn" id="optWithdrawal">💸 &nbsp; Withdrawal</button>
            <button class="option-btn" id="optBonus">🎁 &nbsp; Bonus</button>
            <button class="option-btn" id="optCashback">🛡️ &nbsp; Cashback</button>
        </div>
    `;
    workspace.appendChild(optContainer);

    document.getElementById("optDeposit")?.addEventListener("click", () => handleCategorySelect('Deposit'));
    document.getElementById("optWithdrawal")?.addEventListener("click", () => handleCategorySelect('Withdrawal'));
    document.getElementById("optBonus")?.addEventListener("click", () => handleCategorySelect('Bonus'));
    document.getElementById("optCashback")?.addEventListener("click", () => handleCategorySelect('Cashback'));
    
    triggerSmoothScroll();
}

function handleCategorySelect(category) {
    if (isActionLocked || hasActiveUnresolvedTicket) {
        if(hasActiveUnresolvedTicket) showPremiumToast("Aapka ek ticket pehle se open hai!");
        return;
    }
    
    selectedCategory = category;
    appendUserBubble(category);
    
    const target = CHAT_TREE[category] || [];
    let optionsHtml = "";
    target.forEach((sub, index) => {
        optionsHtml += `<button class="option-btn sub-opt-trigger" data-idx="${index}">${sub.text}</button>`;
    });

    setTimeout(() => {
        const subOptContainer = document.createElement("div");
        subOptContainer.className = "bubble system";
        subOptContainer.innerHTML = `Select specific <b>${category}</b> question: <div class="options-container">${optionsHtml}</div>`;
        document.getElementById("aiChatWorkspace").appendChild(subOptContainer);

        subOptContainer.querySelectorAll(".sub-opt-trigger").forEach(btn => {
            btn.addEventListener("click", (e) => handleSubCategorySelect(parseInt(e.target.getAttribute("data-idx"))));
        });
        triggerSmoothScroll();
    }, 300);
}

function handleSubCategorySelect(index) {
    if (isActionLocked || hasActiveUnresolvedTicket) {
        if(hasActiveUnresolvedTicket) showPremiumToast("Aapka ek ticket pehle se open hai!");
        return;
    }

    const node = CHAT_TREE[selectedCategory][index];
    selectedSubCategory = node.text;
    appendUserBubble(node.text);

    setTimeout(() => {
        if (node.action === "ticket_required") {
            if (hasActiveUnresolvedTicket) {
                showPremiumToast("Aapka ek ticket pehle se open hai!");
                appendSystemBubble(`⚠️ Aapka ek Ticket (${ongoingUnresolvedTicketId}) pehle se pending hai.`);
                return;
            }
            appendSystemBubble(`⚠️ <b>${node.prompt}</b><br><br>Niche details description aur photo attach karke bhejें.`);
            document.getElementById('chatFooterInput').style.setProperty('display', 'flex', 'important');
            triggerSmoothScroll();
        } else {
            appendSystemBubble(node.reply);
            renderSatisfactionFeedbackNode();
            document.getElementById('chatFooterInput').style.setProperty('display', 'flex', 'important');
        }
    }, 300);
}

function renderSatisfactionFeedbackNode() {
    setTimeout(() => {
        const workspace = document.getElementById("aiChatWorkspace");
        const feedbackDiv = document.createElement("div");
        feedbackDiv.className = "bubble system";
        feedbackDiv.innerHTML = `
            <div style="font-weight:600; margin-bottom:8px;">क्या आप इस समाधान से संतुष्ट हैं?</div>
            <div class="options-container" style="display:flex; gap:10px;">
                <button class="option-btn" id="feedbackYesBtn" style="background:rgba(46, 204, 113, 0.2); border:1px solid #2ecc71; flex:1;"><i class="fa-regular fa-thumbs-up"></i> हाँ, बिल्कुल</button>
                <button class="option-btn" id="feedbackNoBtn" style="background:rgba(231, 76, 60, 0.2); border:1px solid #e74c3c; flex:1;"><i class="fa-regular fa-thumbs-down"></i> नहीं, असंतुष्ट</button>
            </div>
        `;
        workspace.appendChild(feedbackDiv);
        triggerSmoothScroll();

        document.getElementById("feedbackYesBtn")?.addEventListener("click", () => {
            if(isActionLocked) return;
            isActionLocked = true;
            appendUserBubble("हाँ, मैं संतुष्ट हूँ।");
            setTimeout(() => { startAiSupportWelcomeNode(); }, 600);
        });

        document.getElementById("feedbackNoBtn")?.addEventListener("click", () => {
            if(isActionLocked) return;
            isActionLocked = true;
            appendUserBubble("नहीं, मैं संतुष्ट नहीं हूँ।");
            setTimeout(() => { renderCustomerCareEscalationNode(); }, 500);
        });
    }, 400);
}

function renderCustomerCareEscalationNode() {
    if (hasActiveUnresolvedTicket) {
        showPremiumToast("Aapka ek ticket pehle se open hai!");
        return;
    }

    const escalationDiv = document.createElement("div");
    escalationDiv.className = "bubble system";
    escalationDiv.innerHTML = `
        <div style="font-weight:600; margin-bottom:6px;">हमें खेद है कि आपको समस्या हुई।</div>
        क्या आप हमारे लाइव कस्टमर केयर अधिकारी से जुड़ना चाहते हैं?
        <div class="options-container" style="margin-top:8px;">
            <button class="option-btn" id="connectLiveCareBtn" style="background:linear-gradient(135deg, #E8B84A, #BA9132); color:#000; font-weight:bold;">🤝 Connect to Live Support</button>
        </div>
    `;
    document.getElementById("aiChatWorkspace").appendChild(escalationDiv);
    triggerSmoothScroll();

    document.getElementById("connectLiveCareBtn")?.addEventListener("click", async (e) => {
        if (hasActiveUnresolvedTicket) {
            showPremiumToast("Aapka ek ticket pehle se open hai!");
            return;
        }

        const btn = e.target;
        btn.disabled = true;
        btn.style.opacity = "0.5";
        
        const randomId = Math.floor(100000 + Math.random() * 900000);
        const ticketId = `SUP-${randomId}`;
        const jsServerTimestamp = new Date();

        try {
            showPremiumToast("Connecting to Customer Care Desk...");
            
            await setDoc(doc(db, "support_tickets", ticketId), {
                ticketId: ticketId, uid: ACTIVE_UID || "UID-ERR", name: ACTIVE_NAME, mobile: ACTIVE_PHONE,
                category: `${selectedCategory || 'General'} - Escalated to Live Support`, description: "User requested live customer care support.", 
                imageUrl: "", status: "Open", text: "Connected via AI Escalation Desk", 
                createdAt: jsServerTimestamp, openedAt: jsServerTimestamp, closedAt: ""                 
            });

            await addDoc(collection(db, "support_tickets", ticketId, "messages"), {
                sender: "system", text: "User has transferred the conversation to Live Support Agent.", image: "", timestamp: jsServerTimestamp
            });

            streamLiveTicketChatWorkspace(ticketId);
        } catch(e) {
            showPremiumToast("Connection failed. Try again.");
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    });
}

function handleSendButtonClick() {
    if (isMessageSendingInProgress) return;
    
    if (activeLiveTicketId) {
        sendDirectLiveChatMessage();
    } else {
        submitTicketPayload();
    }
}

// ==========================================
// 📤 SUBMIT TICKET (DOUBLE IMAGE ISSUE FIXED)
// ==========================================
async function submitTicketPayload() {
    if (isMessageSendingInProgress) return;

    const inputField = document.getElementById('chatInputField');
    const sendBtn = document.getElementById('sendPayloadBtn');
    const attachBtn = document.getElementById('attachFileBtn');
    const descriptionText = inputField.value.trim();
    
    if(!descriptionText && !pendingImageFile) {
        showPremiumToast("Krupya details type karein ya photo attach karein!");
        return;
    }

    if (hasActiveUnresolvedTicket) {
        showPremiumToast("Aapka ek ticket pehle se open hai!");
        return;
    }

    // 🔒 Set Strict Lock
    isMessageSendingInProgress = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        sendBtn.style.opacity = "0.6";
    }
    if (attachBtn) attachBtn.style.pointerEvents = "none";

    let uploadedImageUrl = "";

    try {
        if (pendingImageFile) {
            showPremiumToast("Uploading Image...");
            uploadedImageUrl = await uploadToCloudinary(pendingImageFile);
        }

        let userMsgDisplay = descriptionText;
        if (uploadedImageUrl) {
            userMsgDisplay += `<br><img src="${uploadedImageUrl}" style="max-width:200px; border-radius:8px; margin-top:6px; border:1px solid rgba(255,255,255,0.2);">`;
        }
        appendUserBubble(userMsgDisplay);

        inputField.value = "";
        clearSelectedImage();

        const randomId = Math.floor(100000 + Math.random() * 900000);
        const ticketId = `SUP-${randomId}`;
        const jsServerTimestamp = new Date();

        // 🟢 Set ticket document (Holds primary description & primary image URL)
        await setDoc(doc(db, "support_tickets", ticketId), {
            ticketId: ticketId, 
            uid: ACTIVE_UID || "UID-ERR", 
            name: ACTIVE_NAME, 
            mobile: ACTIVE_PHONE,
            category: `${selectedCategory || 'Support'} - ${selectedSubCategory || 'Query'}`, 
            description: descriptionText || "Attachment Uploaded", 
            imageUrl: uploadedImageUrl, 
            status: "Open", 
            text: descriptionText || "New Ticket Created", 
            createdAt: jsServerTimestamp,
            openedAt: jsServerTimestamp, 
            closedAt: ""                 
        });

        // 🟢 FIX: Messages sub-collection will only store initial text (Image isn't duplicated in sub-collection)
        if (descriptionText) {
            await addDoc(collection(db, "support_tickets", ticketId, "messages"), {
                sender: "user", 
                text: descriptionText, 
                image: "", 
                timestamp: jsServerTimestamp
            });
        }

        const workspace = document.getElementById("aiChatWorkspace");
        workspace.innerHTML = `
            <div class="ticket-success-wrapper">
                <div class="success-icon-shield"><i class="fa-solid fa-circle-check"></i></div>
                <div class="success-headline">Ticket Generated!</div>
                <div class="success-body-box">
                    Dear <b>${ACTIVE_NAME}</b>,<br> 
                    आपका सपोर्ट टिकट नंबर <b style="color:var(--accent-gold); font-size:14px;">${ticketId}</b> सफलतापूर्वक जनरेट हो चुका है।<br><br>
                    <i class="fa-regular fa-clock" style="color:var(--accent-gold)"></i> <b>कृपया प्रतीक्षा करें:</b><br>
                    अधिकारी जांच कर रहे हैं। अधिकतम समय सीमा <b>15 मिनट से 3 घंटा</b> है।<br><br>
                    <span style="color:var(--text-secondary); font-size:11px;">हार्दिक शुभकामनाएं — Deccan Club 2026</span>
                </div>
            </div>
        `;
        workspace.scrollTop = 0;

        setTimeout(() => { streamLiveTicketChatWorkspace(ticketId); }, 4000);

    } catch (err) {
        console.error(err);
        showPremiumToast("Submission Error!");
    } finally {
        // 🔓 Release Lock
        isMessageSendingInProgress = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`;
            sendBtn.style.opacity = "1";
        }
        if (attachBtn) attachBtn.style.pointerEvents = "auto";
    }
}

// Stream Live Workspace
function streamLiveTicketChatWorkspace(ticketId) {
    activeLiveTicketId = ticketId;
    document.getElementById('tabBar').style.display = 'none';
    document.getElementById('lockBannerZone').innerHTML = "";
    
    const footerInputBlock = document.getElementById('chatFooterInput');
    if (footerInputBlock) {
        footerInputBlock.style.setProperty('display', 'flex', 'important');
    }

    const workspace = document.getElementById("aiChatWorkspace");
    
    if(liveTicketDataUnsubscribe) liveTicketDataUnsubscribe();
    
    liveTicketDataUnsubscribe = onSnapshot(doc(db, "support_tickets", ticketId), docSnap => {
        if(docSnap.exists()) {
            const tData = docSnap.data();
            
            const headerTitleEl = document.getElementById('headerTitle');
            if (headerTitleEl) {
                headerTitleEl.innerHTML = `${tData.ticketId} <span style="font-size:11px; margin-left:6px; color:var(--accent-gold)">(${tData.status})</span>`;
            }
            
            if (footerInputBlock) {
                if (tData.status === "Closed") {
                    footerInputBlock.style.setProperty('display', 'none', 'important');
                } else {
                    footerInputBlock.style.setProperty('display', 'flex', 'important');
                }
            }
            
            if (tData.status === "Closed" && !isViewingHistoryTicket) {
                activeLiveTicketId = null;
                document.getElementById('tabBar').style.display = 'flex';
                if (headerTitleEl) headerTitleEl.innerText = "Deccan Club Support";
                startAiSupportWelcomeNode();
            }
        }
    });

    if(liveSnapshotUnsubscribe) liveSnapshotUnsubscribe();

    const messagesQuery = query(collection(db, "support_tickets", ticketId, "messages"), orderBy("timestamp", "asc"));

    liveSnapshotUnsubscribe = onSnapshot(messagesQuery, async (snap) => {
        workspace.innerHTML = ""; 
        
        try {
            const ticketDocRef = doc(db, "support_tickets", ticketId);
            const ticketSnap = await getDoc(ticketDocRef);
            
            if (ticketSnap.exists()) {
                const ticketData = ticketSnap.data();
                if (ticketData.description || ticketData.imageUrl) {
                    const descBubble = document.createElement("div");
                    descBubble.className = "bubble system";
                    descBubble.style.cssText = "border-left: 4px solid var(--accent-gold); background-color: var(--bg-secondary); max-width: 100%; width: 100%; box-sizing: border-box; margin-bottom: 4px;";
                    
                    let imageHtml = ticketData.imageUrl ? `<br><a href="${ticketData.imageUrl}" target="_blank"><img src="${ticketData.imageUrl}" style="max-width:100%; border-radius:8px; margin-top:8px;"></a>` : '';
                    
                    descBubble.innerHTML = `
                        <div style="font-size: 13.5px; line-height: 1.5;">
                            <strong style="color: var(--accent-gold); display: block; margin-bottom: 4px;"><i class="fa-solid fa-pen-to-square"></i> Issue Description:</strong>
                            ${ticketData.description || "No text provided."}
                            ${imageHtml}
                        </div>
                    `;
                    workspace.appendChild(descBubble);
                }
            }
        } catch (err) {
            console.error(err);
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            let roleClass = data.sender === 'user' ? 'user' : (data.sender === 'system' ? 'system' : 'admin');
            let actualMsgText = data.text || data.message || "";
            let imgAttach = data.image || data.imageUrl ? `<br><a href="${data.image || data.imageUrl}" target="_blank"><img src="${data.image || data.imageUrl}" style="max-width:180px; border-radius:8px; margin-top:5px; border:1px solid rgba(255,255,255,0.2);"></a>` : "";
            
            if (actualMsgText || imgAttach) {
                const msgBubble = document.createElement("div");
                msgBubble.className = `bubble ${roleClass}`;
                msgBubble.innerHTML = `${actualMsgText} ${imgAttach}`;
                workspace.appendChild(msgBubble);
            }
        });
        
        triggerSmoothScroll();
    }, (error) => {
        console.error(error);
    });
}

// ==========================================
// 💬 SEND LIVE CHAT MESSAGE
// ==========================================
async function sendDirectLiveChatMessage() {
    if (isMessageSendingInProgress) return;

    const inputField = document.getElementById('chatInputField');
    const sendBtn = document.getElementById('sendPayloadBtn');
    const attachBtn = document.getElementById('attachFileBtn');
    const messageText = inputField.value.trim();
    
    if(!messageText && !pendingImageFile) return;

    // 🔒 Set Strict Lock
    isMessageSendingInProgress = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        sendBtn.style.opacity = "0.6";
    }
    if (attachBtn) attachBtn.style.pointerEvents = "none";

    let uploadedImageUrl = "";

    try {
        if (pendingImageFile) {
            showPremiumToast("Uploading Image...");
            uploadedImageUrl = await uploadToCloudinary(pendingImageFile);
        }

        const currentTicketId = activeLiveTicketId;
        inputField.value = "";
        clearSelectedImage();

        await addDoc(collection(db, "support_tickets", currentTicketId, "messages"), {
            sender: "user", 
            text: messageText, 
            image: uploadedImageUrl, 
            timestamp: new Date()
        });
        
        await setDoc(doc(db, "support_tickets", currentTicketId), {
            lastRepliedBy: "user",
            lastMessageTime: new Date()
        }, { merge: true });

        triggerSmoothScroll();

    } catch(err) {
        showPremiumToast("Message deliver nahi hua!");
    } finally {
        // 🔓 Release Lock
        isMessageSendingInProgress = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`;
            sendBtn.style.opacity = "1";
        }
        if (attachBtn) attachBtn.style.pointerEvents = "auto";
    }
}

function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(type === 'ai_chat') {
        document.getElementById('screenHistory')?.classList.remove('active');
        document.getElementById('screenAiChat')?.classList.add('active');
        document.getElementById('tabAiChat')?.classList.add('active');
        
        if (hasActiveUnresolvedTicket && ongoingUnresolvedTicketId) {
            streamLiveTicketChatWorkspace(ongoingUnresolvedTicketId);
        } else if (!activeLiveTicketId) {
            startAiSupportWelcomeNode();
        }
    } else {
        document.getElementById('screenAiChat')?.classList.remove('active');
        document.getElementById('screenHistory')?.classList.add('active');
        document.getElementById('tabHistory')?.classList.add('active');
        loadHistoricalTicketLogs();
    }
}

function loadHistoricalTicketLogs() {
    const container = document.getElementById("historyLogContainer");
    if (!container) return;
    
    container.innerHTML = "<div style='padding:12px;color:var(--text-secondary);'>Syncing logs...</div>";
    
    if(!db || !ACTIVE_UID) return;

    if(liveHistoryUnsubscribe) liveHistoryUnsubscribe();

    const q = query(collection(db, "support_tickets"), where("uid", "==", ACTIVE_UID));

    liveHistoryUnsubscribe = onSnapshot(q, snap => {
        if(snap.empty) { container.innerHTML = "<div style='padding:12px;color:var(--text-secondary);'>No history available.</div>"; return; }
        
        container.innerHTML = ""; 
        
        let sortedTickets = [];
        snap.forEach(docSnap => {
            sortedTickets.push(docSnap.data());
        });
        
        sortedTickets.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
        });
        
        const optimizedSubset = sortedTickets.slice(0, 5);
        
        optimizedSubset.forEach(d => {
            let jsDateOpen = null;
            let jsDateClose = null;

            let openTimeStr = "ーー";
            let targetOpenTime = d.openedAt || d.createdAt;
            if (targetOpenTime) {
                jsDateOpen = targetOpenTime.toDate ? targetOpenTime.toDate() : new Date(targetOpenTime);
                if (jsDateOpen && !isNaN(jsDateOpen.getTime())) {
                    openTimeStr = jsDateOpen.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + " " + 
                                  jsDateOpen.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
            }

            let closedTimeStr = d.status === "Closed" ? "Processing..." : "Not Closed Yet";
            if (d.closedAt) {
                jsDateClose = d.closedAt.toDate ? d.closedAt.toDate() : new Date(d.closedAt);
                if (jsDateClose && !isNaN(jsDateClose.getTime())) {
                    closedTimeStr = jsDateClose.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + " " + 
                                    jsDateClose.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
            } else if (d.status !== "Closed") {
                closedTimeStr = "ーー";
            }

            let durationBadgeHTML = "";
            if (d.status === "Closed" && jsDateOpen && jsDateClose) {
                let diffInMs = jsDateClose.getTime() - jsDateOpen.getTime();
                
                if (diffInMs > 0) {
                    let totalSeconds = Math.floor(diffInMs / 1000);
                    let minutes = Math.floor(totalSeconds / 60);
                    let seconds = totalSeconds % 60;

                    let finalDurationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                    durationBadgeHTML = `
                        <div style="align-self: flex-end; margin-top: auto; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); padding: 4px 10px; border-radius: 30px; font-size: 11px; font-weight: 700; color: #22c55e; display: flex; align-items: center; gap: 4px; letter-spacing: 0.2px;">
                            <i class="fa-solid fa-bolt" style="font-size: 10px;"></i> Resolved In: ${finalDurationStr}
                        </div>
                    `;
                }
            }

            const card = document.createElement("div");
            card.className = "ticket-card history-trigger";
            card.setAttribute("data-tid", d.ticketId);
            card.innerHTML = `
                <span class="status-badge status-${d.status.toLowerCase()}">${d.status}</span>
                <b style="color:var(--accent-gold); font-size:14px;">${d.ticketId}</b>
                <div style="font-size:12.5px; color:#fff; margin-top:4px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">${d.category}</div>
                
                <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; display:flex; justify-content:space-between; align-items:flex-end;">
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div style="font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
                            <i class="fa-regular fa-folder-open" style="color:var(--color-green); font-size:10px;"></i>
                            <span><strong>Opened:</strong> <span style="color:#f1f5f9;">${openTimeStr}</span></span>
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
                            <i class="fa-regular fa-folder-closed" style="color:${d.status === 'Closed' ? 'var(--color-red)' : '#64748b'}; font-size:10px;"></i>
                            <span><strong>Closed:</strong> <span style="color:${d.status === 'Closed' ? '#f1f5f9' : '#64748b'};">${closedTimeStr}</span></span>
                        </div>
                    </div>
                    ${durationBadgeHTML}
                </div>
            `;
            
            card.addEventListener("click", () => {
                isViewingHistoryTicket = true;
                streamLiveTicketChatWorkspace(d.ticketId);
                switchTab('ai_chat');
            });
            container.appendChild(card);
        });
    }, (error) => {
        console.error("History Log Sync Error:", error);
    });
}

function syncBotRulesWithWalletDatabase() {
    if(!db) return;
    
    if(liveSettingsUnsubscribe) liveSettingsUnsubscribe();

    liveSettingsUnsubscribe = onSnapshot(doc(db, "app_settings", "global_config"), (settingsSnap) => {
        if (settingsSnap && settingsSnap.exists()) {
            const data = settingsSnap.data() || {};
            if (data.global_text?.deposit_page_instructions_footer) window.liveDepositFooter = data.global_text.deposit_page_instructions_footer;
            if (data.global_text?.withdrawal_page_instructions_footer) window.liveWithdrawalFooter = data.global_text.withdrawal_page_instructions_footer;
            const engine = data.withdrawal_engine || {};
            if(engine.withdraw_open_time) window.liveWithdrawalTiming = `${engine.withdraw_open_time} - ${engine.withdraw_close_time}`;
        }
    }, (error) => {
        console.error("Global Rules Snapshot Error:", error);
    });
}

function appendUserBubble(text) {
    const box = document.getElementById("aiChatWorkspace");
    const bubble = document.createElement("div");
    bubble.className = "bubble user";
    bubble.innerHTML = text;
    box.appendChild(bubble);
    triggerSmoothScroll();
}

function appendSystemBubble(text) {
    const box = document.getElementById("aiChatWorkspace");
    const bubble = document.createElement("div");
    bubble.className = "bubble system";
    bubble.innerHTML = text;
    box.appendChild(bubble);
    triggerSmoothScroll();
}

function goBack() {
    const headerTitleEl = document.getElementById('headerTitle');
    
    if (isViewingHistoryTicket) {
        isViewingHistoryTicket = false;
        activeLiveTicketId = null;
        
        document.getElementById('tabBar').style.display = 'flex'; 
        if (headerTitleEl) headerTitleEl.innerText = "Deccan Club Support"; 
        
        switchTab('history');
    } else if (activeLiveTicketId || hasActiveUnresolvedTicket) {
        if (activeLiveTicketId && ongoingUnresolvedTicketId) {
            activeLiveTicketId = null;
            isViewingHistoryTicket = false;
            document.getElementById('tabBar').style.display = 'flex';
            if (headerTitleEl) headerTitleEl.innerText = "Deccan Club Support";
            startAiSupportWelcomeNode();
        } else {
            window.location.href = "index.html"; 
        }
    } else {
        window.location.href = "index.html";
    }
}
