(() => {
  const CART_KEY = 'food2suit_cart';
  const THEME_KEY = 'food2suit_theme';
  const money = value => `GH₵ ${Number(value || 0).toFixed(2)}`;
  const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const saveCart = cart => localStorage.setItem(CART_KEY, JSON.stringify(cart));

  function applyTheme() {
    const dark = localStorage.getItem(THEME_KEY) === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('sf-dark', dark);
  }

  function renderCart() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0);
    const countEl = document.getElementById('sf-cart-count');
    const itemsEl = document.getElementById('sf-cart-items');
    const totalEl = document.getElementById('sf-cart-total');
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = money(total);
    if (itemsEl) itemsEl.innerHTML = cart.length ? cart.map(item => `<div class="sf-cart-item"><div><b>${item.name}</b><small>${money(item.price)} × ${item.qty}</small></div><div><button onclick="Food2Suit.changeQty('${item.cartId}',-1)">−</button><button onclick="Food2Suit.changeQty('${item.cartId}',1)">+</button></div></div>`).join('') : '<p class="sf-empty">Your tray is empty.</p>';
  }

  function addToCart(item) {
    const cart = getCart();
    const cartId = item.cartId || `${item.id}-${item.option || ''}`;
    const existing = cart.find(entry => entry.cartId === cartId);
    if (existing) existing.qty += item.qty || 1;
    else cart.push({ id: item.id, cartId, name: item.name, price: Number(item.price), qty: item.qty || 1 });
    saveCart(cart); renderCart();
  }

  window.Food2Suit = {
    addToCart,
    changeQty(cartId, delta) {
      const cart = getCart(); const item = cart.find(entry => entry.cartId === cartId);
      if (item) item.qty += delta;
      saveCart(cart.filter(entry => entry.qty > 0)); renderCart();
    },
    toggleCart() { document.getElementById('sf-cart-drawer').classList.toggle('open'); },
    toggleTheme() { localStorage.setItem(THEME_KEY, document.documentElement.classList.contains('dark') ? 'light' : 'dark'); applyTheme(); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.body.insertAdjacentHTML('beforeend', `<button id="sf-theme" onclick="Food2Suit.toggleTheme()" aria-label="Switch color theme">◐</button><button id="sf-cart" onclick="Food2Suit.toggleCart()" aria-label="Open food tray">🛒<span id="sf-cart-count">0</span></button><aside id="sf-cart-drawer"><div class="sf-cart-head"><b>Your Food Tray</b><button onclick="Food2Suit.toggleCart()">×</button></div><div id="sf-cart-items"></div><div class="sf-cart-foot"><span>Total</span><b id="sf-cart-total">GH₵ 0.00</b><button onclick="alert('Checkout is coming soon.')">Checkout</button></div></aside>`);
    renderCart();
    if (location.pathname.endsWith('/menu.html') && typeof window.type === 'function') {
      const originalType = window.type;
      window.type = product => ['rice', 'local', 'salads', 'drinks', 'proteins'].includes(product.category) ? product.category : originalType(product);
      if (typeof window.render === 'function') window.render();
    }
  });
})();
