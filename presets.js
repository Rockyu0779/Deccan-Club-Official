// ==========================================
// 🤖 BOT RESPONSE MATRIX & PRESETS CONFIG
// ==========================================
export const CHAT_TREE = {
    "Deposit": [
        { 
            text: "Deposit not credited (पैसे ऐड नहीं हुए)", 
            action: "ticket_required", 
            prompt: "Kindly share the payment UTR details or screenshot to generate a support ticket." 
        },
        { 
            text: "Deposit nahi ho raha / Not working", 
            action: "instruction", 
            reply: `<div class="premium-support-card"><div class="card-title-node">⚙️ Troubleshooting</div><ul style="margin:0; padding-left:16px; font-size:12px; color:var(--text-secondary);"><li>App ko background se clear karke Restart karein.</li><li>Banking network slow hone par dusra UPI App use karein.</li></ul></div>` 
        },
        { 
            text: "Deposit Instruction", 
            action: "instruction", 
            get reply() { 
                const footerText = window.liveDepositFooter || "Loading live instructions...";
                return `<div class="premium-support-card"><div class="card-title-node">📋 Instructions</div><div style="font-size:12px; color:var(--text-secondary); white-space: pre-line;">${footerText}</div></div>`; 
            } 
        }
    ],
    "Withdrawal": [
        { 
            text: "Withdrawal success But Not Received (पैसे सफल, पर खाते में नहीं आये)", 
            action: "ticket_required", 
            prompt: "Krupya transaction UTR details / bank statement screenshot share karein." 
        },
        { 
            text: "Withdrawal nahi ho raha / Timing kya hai?", 
            action: "instruction", 
            get reply() { 
                const timingText = window.liveWithdrawalTiming || "Loading timings...";
                return `<div class="premium-support-card"><div class="card-title-node">⏳ Payout Slots</div><div style="font-size:13px; color:var(--text-primary);"><i class="fa-regular fa-clock"></i> Timing: ${timingText}</div></div>`; 
            } 
        }
    ],
    "Bonus": [
        { 
            text: "Referral Bonus not received (रेफ़रल बोनस नहीं मिला)", 
            action: "ticket_required", 
            prompt: "Krupya downline user ka registered mobile number aur platform details me likhein." 
        },
        { 
            text: "Promo Code / Sign-up Bonus issue", 
            action: "instruction", 
            reply: `<div class="premium-support-card"><div class="card-title-node">🎁 Bonus Rules</div><ul style="margin:0; padding-left:16px; font-size:12px; color:var(--text-secondary);"><li>Sign-up bonus auto-credit hota hai account validation ke baad.</li><li>Ek device par multiple accounts hone par bonus block kar diya jata hai.</li></ul></div>` 
        }
    ],
    "Cashback": [
        { 
            text: "Daily/Weekly Loss Cashback query", 
            action: "instruction", 
            reply: `<div class="premium-support-card"><div class="card-title-node">🛡️ Cashback Calculation</div><p style="margin:0; font-size:12px; color:var(--text-secondary);">Cashback har cycle ke end par auto-calculate hokar aapke wallet balance me transfer hota hai.</p></div>` 
        },
        { 
            text: "Wrong cashback configuration claim", 
            action: "ticket_required", 
            prompt: "Aapko jis date range ke cashback me issue lag raha hai, uski detail share karein." 
        }
    ]
};
