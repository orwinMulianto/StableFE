
const packages = {
    Bronze: {
        name: "Bronze",
        price: 500000,
        color: "#CD7F32",
        features: ["Basic workout plan", "Weekly check-in", "Chat support (8 hours)", "Nutrition guide PDF"]
    },
    Silver: {
        name: "Silver",
        price: 1000000,
        color: "#C0C0C0",
        features: ["Intermediate workout plan", "Daily check-in", "Chat support (12 hours)", "Video call coaching (2x/month)", "Customized nutrition plan"]
    },
    Gold: {
        name: "Gold",
        price: 2000000,
        color: "#FFD700",
        features: ["Advanced workout plan", "Unlimited chat support", "Weekly video call coaching", "Personalized meal plan", "Form analysis (video review)", "Priority support"]
    }
};

function updateGreeting() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('userName') || 'Guest';
    const greetingSpan = document.getElementById('userGreeting');
    if (greetingSpan) {
        greetingSpan.innerText = isLoggedIn ? userName : 'Guest';
    }
}

document.querySelectorAll('.subscribe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tier = btn.dataset.tier;
        showCheckoutModal(tier);
    });
});

function showCheckoutModal(tier) {
    const package = packages[tier];
    const modal = document.getElementById('checkoutModal');
    const summaryDiv = document.getElementById('checkoutPackage');
    const totalSpan = document.getElementById('totalAmount');
    
    summaryDiv.innerHTML = `
        <h4 style="color: ${package.color}">${package.name} Package</h4>
        <div class="price">Rp ${package.price.toLocaleString()}<span style="font-size:14px">/month</span></div>
        <div style="margin-top:12px; text-align:left;">
            ${package.features.map(f => `<div style="padding:4px 0;">✓ ${f}</div>`).join('')}
        </div>
    `;
    
    totalSpan.innerText = `Rp ${package.price.toLocaleString()}`;
    modal.classList.add('active');
    modal.dataset.selectedTier = tier;
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    modal.classList.remove('active');
}

function payNow() {
    const modal = document.getElementById('checkoutModal');
    const tier = modal.dataset.selectedTier;
    const package = packages[tier];
    
    alert(`Payment successful! You've subscribed to ${package.name} package.`);
    closeCheckoutModal();
}

document.getElementById('closeCheckoutBtn')?.addEventListener('click', closeCheckoutModal);
document.getElementById('cancelCheckoutBtn')?.addEventListener('click', closeCheckoutModal);
document.getElementById('payNowBtn')?.addEventListener('click', payNow);

document.getElementById('checkoutModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'checkoutModal') closeCheckoutModal();
});


updateGreeting();