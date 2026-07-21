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
// 🔊 साउंड इफेक्ट्स (Safe Audio Setup)
// ==========================================
const spinAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3');
const winAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');

// ==========================================
// 🎯 व्हील रिवॉर्ड लिस्ट (Unchanged Exact Rewards)
// ==========================================
const rewards = [
  { label: "₹10", amount: 10, color: "#2563eb", textColor: "#ffffff" },                   // Index 0
  { label: "Better Luck Next Time", amount: 0, color: "#1e293b", textColor: "#cbd5e1" }, // Index 1
  { label: "₹50", amount: 50, color: "#059669", textColor: "#ffffff" },                  // Index 2
  { label: "₹5", amount: 5, color: "#7c3aed", textColor: "#ffffff" },                    // Index 3
  { label: "Better Luck Next Time", amount: 0, color: "#334155", textColor: "#cbd5e1" }, // Index 4
  { label: "₹100", amount: 100, color: "#d97706", textColor: "#ffffff" },                // Index 5
  { label: "₹20", amount: 20, color: "#db2777", textColor: "#ffffff" },                  // Index 6
  { label: "₹500", amount: 500, color: "#dc2626", textColor: "#ffffff" }                 // Index 7
];

let currentUser = null;
let currentChances = 0;
let totalUserDeposit = 0;
let isSpinning = false;
let currentRotation = 0;
let isFreeSpin = false;

// 🔗 URL से पैरामीटर पढ़ने का फ़ंक्शन (App WebView Support)
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Page Load Handling
document.addEventListener("DOMContentLoaded", () => {
  // 1. Wheel ड्रॉ करें
  drawWheelHD();

  // 2. सबसे पहले चेक करें कि क्या URL में uid या mobile पास हुआ है (App के लिए)
  const urlUid = getQueryParam("uid");
  const urlMobile = getQueryParam("mobile");

  if (urlUid || urlMobile) {
    currentUser = { uid: urlUid, mobile: urlMobile };
    syncUserDataAndDeposit(currentUser);
  } 
  // 3. अगर URL में नहीं मिला, तो normal session चेक करें (Website के लिए)
  else if (window.checkSession) {
    window.checkSession((userState) => {
      if (userState) {
        currentUser = userState;
        syncUserDataAndDeposit(userState);
      }
    });
  }

  const spinBtn = document.getElementById("spinBtn");
  if (spinBtn) {
    spinBtn.addEventListener("click", startSpin);
  }
});

// ==========================================
// 🎨 Canvas Wheel Renderer (HD UI)
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
// 🔄 Sync Balance, Spins & Lifetime Deposit (WebView Optimized)
// ==========================================
async function syncUserDataAndDeposit(userState) {
  try {
    let userSnap = null;
    let userRef = null;

    // A. Priority 1: Check by UID
    if (userState.uid) {
      userRef = doc(db, "user-management", userState.uid);
      userSnap = await getDoc(userRef);
    }

    // B. Priority 2: Check by Mobile Number
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

    // C. Update UI with User Data
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();

      // Ensure currentUser has valid ID
      currentUser.uid = userRef.id;

      // 1. Balance Update
      const currentBalance = data.accountBalance !== undefined 
        ? data.accountBalance 
        : (data.wallet !== undefined ? data.wallet : (data.balance || 0));

      const balanceEl = document.getElementById("walletBalance");
      if (balanceEl) balanceEl.textContent = `₹${currentBalance}`;

      // 2. Daily Free Spin Logic (1 Spin/Day)
      const todayStr = new Date().toISOString().split("T")[0];
      let spinChances = data.spinChances || 0;
      let lastSpinDate = data.lastSpinDate || "";

      if (lastSpinDate !== todayStr) {
        spinChances += 1; // नया फ्री चांस
        isFreeSpin = true;
        await updateDoc(userRef, {
          spinChances: spinChances,
          lastSpinDate: todayStr
        }).catch(e => console.warn(e));
      } else {
        isFreeSpin = false;
      }

      currentChances = spinChances;
      const chancesEl = document.getElementById("spinChancesCount");
      if (chancesEl) chancesEl.textContent = currentChances;

      const spinBtn = document.getElementById("spinBtn");
      if (spinBtn) spinBtn.disabled = currentChances <= 0;

      // 3. Lifetime Successful Deposits Calculation
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
        console.warn("Tx query skipped or index missing:", txErr);
      }
    }
  } catch (err) {
    console.error("Data Sync Error:", err);
  }
}

// ==========================================
// 🎲 Exact Custom Probability Math Logic (SAME TO SAME)
// ==========================================
function calculateWinningIndex(isFree, deposit) {
  const rand = Math.random() * 100;

  // 🔴 RULE 1: डेली फ्री स्पिन (Max Reward ₹10)
  if (isFree) {
    if (rand < 85) {
      return Math.random() > 0.5 ? 1 : 4;
    } else if (rand < 95) {
      return 3;
    } else {
      return 0;
    }
  }

  // 🟡 RULE 2: लेवल 2 यूज़र (Total Deposit < ₹10,000)
  if (deposit < 10000) {
    if (rand < 80) {
      return Math.random() > 0.5 ? 1 : 4;
    } else if (rand < 81.5) {
      return 3;
    } else if (rand < 83.5) {
      return 0;
    } else if (rand < 85.0) {
      return 6;
    } else if (rand < 98.5) {
      return 2;
    } else if (rand < 99.5) {
      return 5;
    } else {
      return 7;
    }
  } 

  // 🟢 RULE 3: लेवल 3 VIP यूज़र (Total Deposit >= ₹10,000)
  else {
    if (rand < 80) {
      return Math.random() > 0.5 ? 1 : 4;
    } else if (rand < 81.0) {
      return 3;
    } else if (rand < 82.0) {
      return 0;
    } else if (rand < 83.0) {
      return 6;
    } else if (rand < 96.0) {
      return 2;
    } else if (rand < 98.0) {
      return 5;
    } else {
      return 7;
    }
  }
}

// ==========================================
// 🚀 Start Spin Animation & Audio
// ==========================================
async function startSpin() {
  if (isSpinning || currentChances <= 0 || !currentUser) return;

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
// 💾 Process Result & Save to Firestore
// ==========================================
async function processSpinResult(reward) {
  try {
    const uid = currentUser.uid;
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
    syncUserDataAndDeposit(currentUser);
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
    
    actionContainer.innerHTML = `
      <button class="modal-close-btn" id="closeModalBtn">ठीक है</button>
    `;

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
