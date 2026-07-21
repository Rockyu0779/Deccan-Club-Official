import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 🔊 साउंड इफेक्ट्स (Safe Handling)
// ==========================================
const spinAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3');
const winAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');

// ==========================================
// 🎯 व्हील रिवॉर्ड लिस्ट (8 Slices)
// ==========================================
const rewards = [
  { label: "₹10", amount: 10, color: "#2563eb", textColor: "#ffffff" },
  { label: "Better Luck Next Time", amount: 0, color: "#1e293b", textColor: "#cbd5e1" },
  { label: "₹50", amount: 50, color: "#059669", textColor: "#ffffff" },
  { label: "₹5", amount: 5, color: "#7c3aed", textColor: "#ffffff" },
  { label: "Better Luck Next Time", amount: 0, color: "#334155", textColor: "#cbd5e1" },
  { label: "₹100", amount: 100, color: "#d97706", textColor: "#ffffff" },
  { label: "₹20", amount: 20, color: "#db2777", textColor: "#ffffff" },
  { label: "₹500", amount: 500, color: "#dc2626", textColor: "#ffffff" }
];

let currentUser = null;
let currentChances = 0;
let totalUserDeposit = 0;
let isSpinning = false;
let currentRotation = 0;
let isFreeSpin = false;

// ==========================================
// 🔍 3-WAY SAFE UID EXTRACTOR (App & Browser Fix)
// ==========================================
function getSafeUserId() {
  // 1. URL Parameter check (?uid=...)
  const urlParams = new URLSearchParams(window.location.search);
  let uid = urlParams.get('uid');
  if (uid && uid.trim() !== "") return uid.trim();

  // 2. LocalStorage check
  uid = localStorage.getItem("deccan_uid") || 
        localStorage.getItem("uid") || 
        localStorage.getItem("user_id") ||
        localStorage.getItem("deccan_session_uid");
  if (uid && uid.trim() !== "") return uid.trim();

  // 3. Current User Object check
  if (currentUser && currentUser.uid) {
    return currentUser.uid;
  }

  return null;
}

// Page Load Handling
document.addEventListener("DOMContentLoaded", () => {
  // 1. व्हील को तुरंत ड्रॉ करें
  requestAnimationFrame(() => {
    drawWheelHD();
  });

  // 2. Multi-Level User Session Initialization
  initSessionAndData();

  const spinBtn = document.getElementById("spinBtn");
  if (spinBtn) {
    spinBtn.addEventListener("click", startSpin);
  }
});

async function initSessionAndData() {
  // Direct UID Fetching (URL / LocalStorage)
  let directUid = getSafeUserId();
  
  if (directUid) {
    currentUser = { uid: directUid };
    await syncUserDataAndDeposit(currentUser);
  }

  // Session Helper Check (with Retry Delay for WebView App)
  if (window.checkSession) {
    window.checkSession((userState) => {
      if (userState && userState.uid) {
        currentUser = userState;
        syncUserDataAndDeposit(userState);
      }
    });
  } else {
    // If checkSession takes time to bind, retry after 800ms
    setTimeout(() => {
      if (window.checkSession) {
        window.checkSession((userState) => {
          if (userState && userState.uid) {
            currentUser = userState;
            syncUserDataAndDeposit(userState);
          }
        });
      }
    }, 800);
  }
}

// ==========================================
// 🎨 Canvas Wheel Renderer
// ==========================================
function drawWheelHD() {
  const canvas = document.getElementById("wheelCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const numSegments = rewards.length;
  const arcSize = (2 * Math.PI) / numSegments;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  rewards.forEach((segment, i) => {
    const angle = i * arcSize;

    // Slice BG
    ctx.beginPath();
    ctx.fillStyle = segment.color;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    // Border Lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();

    // Text Render
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = "right";

    ctx.font = "900 22px 'Segoe UI', Roboto, sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = segment.textColor;

    ctx.fillText(segment.label, radius - 30, 8);
    ctx.restore();
  });
}

// ==========================================
// 🔄 Safe Sync Balance, Spins & Lifetime Deposit
// ==========================================
async function syncUserDataAndDeposit(userState) {
  try {
    let userSnap = null;
    let userRef = null;

    const activeUid = userState.uid || getSafeUserId();
    if (!activeUid) return;

    userRef = doc(db, "user-management", activeUid);
    userSnap = await getDoc(userRef);

    if ((!userSnap || !userSnap.exists()) && userState.mobile) {
      const q = query(
        collection(db, "user-management"),
        where("mobileNumber", "==", userState.mobile)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        userSnap = querySnap.docs[0];
        userRef = doc(db, "user-management", userSnap.id);
      }
    }

    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();

      // Ensure currentUser maintains UID
      if (!currentUser) currentUser = { uid: userRef.id };
      else currentUser.uid = userRef.id;

      // 1. Balance Update
      const currentBalance = data.accountBalance !== undefined 
        ? data.accountBalance 
        : (data.wallet !== undefined ? data.wallet : (data.balance || 0));

      const balanceEl = document.getElementById("walletBalance");
      if (balanceEl) balanceEl.textContent = `₹${currentBalance}`;

      // 2. Daily Free Spin Logic
      const todayStr = new Date().toISOString().split("T")[0];
      let spinChances = data.spinChances || 0;
      let lastSpinDate = data.lastSpinDate || "";

      if (lastSpinDate !== todayStr) {
        spinChances += 1;
        isFreeSpin = true;
        await updateDoc(userRef, {
          spinChances: spinChances,
          lastSpinDate: todayStr
        }).catch(e => console.warn("Update error:", e));
      } else {
        isFreeSpin = false;
      }

      currentChances = spinChances;
      const chancesEl = document.getElementById("spinChancesCount");
      if (chancesEl) chancesEl.textContent = currentChances;

      const spinBtn = document.getElementById("spinBtn");
      if (spinBtn) spinBtn.disabled = currentChances <= 0;

      // 3. Lifetime Deposits
      try {
        const txQuery = query(
          collection(db, "transactions"),
          where("uid", "==", userRef.id),
          where("status", "==", "success"),
          where("type", "==", "DEPOSIT")
        );

        const txSnap = await getDocs(txQuery);
        totalUserDeposit = 0;

        txSnap.forEach((docItem) => {
          totalUserDeposit += Number(docItem.data().amount || 0);
        });
      } catch (txErr) {
        console.warn("Transactions query failed:", txErr);
      }
    }
  } catch (err) {
    console.error("Data Sync Error:", err);
  }
}

// ==========================================
// 🎲 Custom Probability Math Logic
// ==========================================
function calculateWinningIndex(isFree, deposit) {
  const rand = Math.random() * 100;

  if (isFree) {
    if (rand < 85) return Math.random() > 0.5 ? 1 : 4;
    else if (rand < 95) return 3;
    else return 0;
  }

  if (deposit < 10000) {
    if (rand < 80) return Math.random() > 0.5 ? 1 : 4;
    else if (rand < 81.5) return 3;
    else if (rand < 83.5) return 0;
    else if (rand < 85.0) return 6;
    else if (rand < 98.5) return 2;
    else if (rand < 99.5) return 5;
    else return 7;
  } else {
    if (rand < 80) return Math.random() > 0.5 ? 1 : 4;
    else if (rand < 81.0) return 3;
    else if (rand < 82.0) return 0;
    else if (rand < 83.0) return 6;
    else if (rand < 96.0) return 2;
    else if (rand < 98.0) return 5;
    else return 7;
  }
}

// ==========================================
// 🚀 Start Spin Animation
// ==========================================
async function startSpin() {
  const uid = getSafeUserId();
  if (isSpinning || currentChances <= 0 || !uid) return;

  isSpinning = true;
  document.getElementById("spinBtn").disabled = true;

  try {
    spinAudio.currentTime = 0;
    spinAudio.loop = true;
    spinAudio.play().catch(() => {});
  } catch(e){}

  const winningIndex = calculateWinningIndex(isFreeSpin, totalUserDeposit);
  const selectedReward = rewards[winningIndex];

  const numSegments = rewards.length;
  const segmentDegrees = 360 / numSegments;

  const extraRounds = (6 + Math.floor(Math.random() * 2)) * 360;
  const targetDegree = 270 - (winningIndex * segmentDegrees + segmentDegrees / 2);
  const totalRotation = currentRotation + extraRounds + (targetDegree - (currentRotation % 360));

  currentRotation = totalRotation;
  const canvas = document.getElementById("wheelCanvas");
  canvas.style.transform = `rotate(${totalRotation}deg)`;

  setTimeout(async () => {
    try {
      spinAudio.pause();
      spinAudio.currentTime = 0;
    } catch(e){}

    if (selectedReward.amount > 0) {
      try {
        winAudio.currentTime = 0;
        winAudio.play().catch(() => {});
      } catch(e){}
    }

    await processSpinResult(selectedReward);
    isSpinning = false;
  }, 4500);
}

// ==========================================
// 💾 Save Result to Firestore
// ==========================================
async function processSpinResult(reward) {
  try {
    const uid = getSafeUserId();
    if (!uid) return;

    let userRef = doc(db, "user-management", uid);

    currentChances -= 1;
    document.getElementById("spinChancesCount").textContent = currentChances;

    const updates = { spinChances: increment(-1) };

    if (reward.amount > 0) {
      updates.accountBalance = increment(reward.amount);

      await addDoc(collection(db, "pass-back"), {
        uid: userRef.id,
        title: "लकी स्पिन इनाम",
        remark: `स्पिन व्हील से ₹${reward.amount} का रिवॉर्ड प्राप्त हुआ`,
        amount: reward.amount,
        type: "credit",
        timestamp: Date.now(),
        date: new Date().toLocaleString()
      }).catch(e => console.warn(e));
    }

    await updateDoc(userRef, updates).catch(e => console.warn(e));
    syncUserDataAndDeposit({ uid: uid });
    showRewardModal(reward);

  } catch (err) {
    console.error("Spin Result Processing Error:", err);
  }
}

// ==========================================
// 🎁 Show Result Modal Popup
// ==========================================
function showRewardModal(reward) {
  const modal = document.getElementById("rewardModal");
  const modalIcon = document.getElementById("modalIcon");
  const modalTitle = document.getElementById("modalTitle");
  const modalMsg = document.getElementById("modalMessage");
  const actionContainer = document.getElementById("modalActionContainer");

  if (reward.amount > 0) {
    modalIcon.innerHTML = `<i class="fa-solid fa-gift" style="color:#10b981;"></i>`;
    modalTitle.textContent = "बधाई हो!";
    modalMsg.textContent = `आप स्पिन व्हील में ₹${reward.amount} का कैश रिवॉर्ड जीत चुके हैं!`;
    actionContainer.innerHTML = `<button class="modal-close-btn" id="closeModalBtn">ठीक है</button>`;

    document.getElementById("closeModalBtn").addEventListener("click", () => {
      modal.classList.remove("active");
    });
  } else {
    modalIcon.innerHTML = `<i class="fa-solid fa-face-frown" style="color:#f59e0b;"></i>`;
    modalTitle.textContent = "Better Luck Next Time!";
    modalMsg.innerHTML = "Want to earn more chance?<br><b>Deposit ₹200 and get 1 more spin!</b>";
    actionContainer.innerHTML = `
      <a href="wallet-center.html?page=deposit" class="modal-cta-btn">
        <i class="fa-solid fa-wallet"></i> डिपॉजिट करें & स्पिन पाएं
      </a>
    `;
  }

  modal.classList.add("active");
}
