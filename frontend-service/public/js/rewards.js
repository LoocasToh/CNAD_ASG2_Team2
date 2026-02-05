// This data will eventually come from your SQL 'shop_items' table via Fetch API
const shopItems = [
    { id: 1, name: 'Wizard Hat', category: 'hat', price: 150, img: 'assets/hat-wizard.png' },
    { id: 2, name: 'Cool Shades', category: 'accessory', price: 80, img: 'assets/acc-shades.png' },
    { id: 3, name: 'Red Hoodie', category: 'clothing', price: 200, img: 'assets/cloth-hoodie.png' },
    { id: 4, name: 'Crown', category: 'hat', price: 500, img: 'assets/hat-crown.png' }
];

let balance = 1200;

function initShop() {
    const container = document.getElementById('items-container');
    shopItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <h4>${item.name}</h4>
            <p>💰 ${item.price}</p>
            <button class="buy-btn" onclick="confirmPurchase(${item.id})">Buy & Wear</button>
        `;
        container.appendChild(card);
    });
}

function confirmPurchase(id) {
    const item = shopItems.find(i => i.id === id);
    if (balance < item.price) {
        alert("Not enough coins!");
        return;
    }

    const modal = document.getElementById('modal');
    document.getElementById('modal-text').innerText = `Purchase ${item.name} for ${item.price} coins?`;
    modal.style.display = 'flex';

    document.getElementById('confirm-btn').onclick = () => {
        balance -= item.price;
        document.getElementById('coin-balance').innerText = balance;
        document.getElementById(`view-${item.category}`).src = item.img;
        closeModal();
    };
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.currentTarget.classList.add('active');
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function resetOutfit() {
    document.getElementById('view-clothing').src = "";
    document.getElementById('view-hat').src = "";
    document.getElementById('view-accessory').src = "";
}

// Initialize
initShop();