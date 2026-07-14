(() => {
  const CART_KEY = 'food2suit_cart';
  const THEME_KEY = 'food2suit_theme';
  const money = value => `GH₵ ${Number(value || 0).toFixed(2)}`;
  const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const saveCart = cart => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const optionData = option => typeof option === 'string' ? { name: option, price: 5 } : { name: option.name || 'Custom side', price: Number(option.price || 0) };

  function applyTheme() {
    const dark = localStorage.getItem(THEME_KEY) === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('sf-dark', dark);
  }

  function renderCart() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0);
    ['sf-cart-count', 'cart-count'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = count; });
    const itemsEl = document.getElementById('sf-cart-items');
    const totalEl = document.getElementById('sf-cart-total');
    if (totalEl) totalEl.textContent = money(total);
    if (itemsEl) itemsEl.innerHTML = cart.length ? cart.map(item => `<div class="sf-cart-item"><div><b>${item.name}</b><small>${money(item.price)} × ${item.qty}</small></div><div><button aria-label="Remove one" onclick="Food2Suit.changeQty('${item.cartId}',-1)">−</button><button aria-label="Add one" onclick="Food2Suit.changeQty('${item.cartId}',1)">+</button></div></div>`).join('') : '<p class="sf-empty">Your tray is empty.</p>';
  }

  function addToCart(item) {
    const cart = getCart();
    const cartId = item.cartId || `${item.id}-${item.option || ''}`;
    const existing = cart.find(entry => entry.cartId === cartId);
    if (existing) existing.qty += item.qty || 1;
    else cart.push({ id: item.id, cartId, name: item.name, price: Number(item.price), qty: item.qty || 1 });
    saveCart(cart); renderCart();
  }

  function closeCustomizer() { document.getElementById('sf-customizer')?.classList.remove('open'); }
  function addProduct(product) {
    const options = (product.options || []).map(optionData);
    if (!options.length) return addToCart(product);
    const modal = document.getElementById('sf-customizer');
    document.getElementById('sf-customizer-title').textContent = product.name;
    document.getElementById('sf-customizer-base').textContent = `Base price: ${money(product.price)}`;
    const choices = document.getElementById('sf-customizer-options');
    choices.innerHTML = `<label class="sf-option active"><input type="radio" name="sf-side" value="-1" checked><span><b>No extra side</b><small>Keep it as served</small></span><strong>Included</strong></label>` + options.map((side, i) => `<label class="sf-option"><input type="radio" name="sf-side" value="${i}"><span><b>${side.name}</b><small>Added to your dish</small></span><strong>+ ${money(side.price)}</strong></label>`).join('');
    choices.querySelectorAll('.sf-option').forEach(label => label.addEventListener('change', () => choices.querySelectorAll('.sf-option').forEach(x => x.classList.toggle('active', x.querySelector('input').checked))));
    document.getElementById('sf-customizer-confirm').onclick = () => {
      const chosen = Number(choices.querySelector('input:checked').value);
      const side = chosen >= 0 ? options[chosen] : null;
      addToCart({ ...product, name: side ? `${product.name} — ${side.name}` : product.name, price: Number(product.price) + (side?.price || 0), option: side?.name || '' });
      closeCustomizer();
    };
    modal.classList.add('open');
  }

  function ensureHeaderControls() {
    if (document.getElementById('sf-header-controls') || document.getElementById('cart-count')) return;
    const headerRow = document.querySelector('header > div');
    if (!headerRow) return;
    const controls = document.createElement('div');
    controls.id = 'sf-header-controls';
    controls.className = 'sf-header-controls';
    controls.innerHTML = `<button onclick="Food2Suit.toggleTheme()" aria-label="Switch color theme" class="sf-header-button"><span class="sf-theme-mark">◐</span></button><button onclick="Food2Suit.toggleCart()" aria-label="Open food tray" class="sf-header-button sf-tray-button">🛒<span id="sf-cart-count">0</span></button>`;
    headerRow.appendChild(controls);
  }

  function addFooter() {
    if (document.querySelector('.sf-footer')) return;
    document.body.insertAdjacentHTML('beforeend', `<footer class="sf-footer"><div><a href="index.html" class="sf-footer-brand">Food2Suit</a><p>Everything Food — prepared with care, served with love.</p></div><nav><a href="menu.html">Menu</a><a href="offers.html">Offers & Bundles</a><a href="contact.html">Contact Us</a></nav><p class="sf-copy">© 2026 Food2Suit. All rights reserved.</p></footer>`);
  }

  function addHomeSections() {
    const onHome = /(^|\/)index\.html$/.test(location.pathname) || /Food2suit\.com\/$/.test(location.pathname);
    if (!onHome || document.getElementById('sf-home-extras')) return;
    const anchor = document.querySelector('#view-home') || document.querySelector('main');
    anchor.insertAdjacentHTML('beforeend', `<div id="sf-home-extras" class="sf-home-extras"><section class="sf-about"><div><p class="sf-kicker">About Food2Suit</p><h2>Food that feels like home.</h2></div><p>From everyday meals to celebrations, Food2Suit brings trusted local flavour, quality ingredients, and warm service to every order.</p></section><section class="sf-testimonials"><p class="sf-kicker">Customer love</p><h2>What our customers say</h2><div class="sf-testimonial-grid"><figure>“The jollof was rich, smoky and arrived hot. I’ll definitely order again.”<figcaption>— Ama, Accra</figcaption></figure><figure>“Easy to order, generous portions, and the family pack was perfect.”<figcaption>— Kwesi, East Legon</figcaption></figure><figure>“Fresh food with thoughtful service every single time.”<figcaption>— Esi, Osu</figcaption></figure></div></section></div>`);
  }

  window.Food2Suit = {
    addToCart,
    addProduct,
    formatMoney: money,
    normalizeOption: optionData,
    changeQty(cartId, delta) { const cart = getCart(); const item = cart.find(entry => entry.cartId === cartId); if (item) item.qty += delta; saveCart(cart.filter(entry => entry.qty > 0)); renderCart(); },
    toggleCart() { document.getElementById('sf-cart-drawer')?.classList.toggle('open'); },
    toggleTheme() { localStorage.setItem(THEME_KEY, document.documentElement.classList.contains('dark') ? 'light' : 'dark'); applyTheme(); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(); ensureHeaderControls(); addHomeSections(); addFooter();
    document.body.insertAdjacentHTML('beforeend', `<aside id="sf-cart-drawer" aria-label="Food tray"><div class="sf-cart-head"><b>Your Food Tray</b><button onclick="Food2Suit.toggleCart()" aria-label="Close tray">×</button></div><div id="sf-cart-items"></div><div class="sf-cart-foot"><span>Total</span><b id="sf-cart-total">GH₵ 0.00</b><button onclick="alert('Checkout is coming soon.')">Checkout</button></div></aside><div id="sf-customizer" role="dialog" aria-modal="true"><div class="sf-customizer-backdrop" onclick="document.getElementById('sf-customizer').classList.remove('open')"></div><div class="sf-customizer-box"><button class="sf-modal-close" onclick="document.getElementById('sf-customizer').classList.remove('open')" aria-label="Close">×</button><p class="sf-kicker">Make it yours</p><h2 id="sf-customizer-title"></h2><p id="sf-customizer-base"></p><div id="sf-customizer-options"></div><button id="sf-customizer-confirm" class="sf-confirm">Add to tray</button></div></div>`);
    renderCart();
  });
})();
