(() => {
  const CART_KEY = 'food2suit_cart';
  const THEME_KEY = 'food2suit_theme';
  const money = value => `GH₵ ${Number(value || 0).toFixed(2)}`;
  const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const saveCart = cart => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const optionData = option => typeof option === 'string' ? { name: option, price: 0 } : { name: option.name || 'Custom side', price: Number(option.price || 0) };

  function applyTheme() {
    const dark = localStorage.getItem(THEME_KEY) === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('sf-dark', dark);
  }

  const shopInfo = () => JSON.parse(localStorage.getItem('food2suit_registry_meta') || '{}');
  function ghanaTime() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  }
  const ghanaDateKey = () => { const time = ghanaTime(); return `${time.year}-${time.month}-${time.day}`; };
  const isWithinBusinessHours = () => { const hour = Number(ghanaTime().hour); return hour >= 8 && hour < 18; };
  const isManuallyClosedToday = () => { const info = shopInfo(); return info.shopOpen === false && info.manualClosedOn === ghanaDateKey(); };
  const isShopOpen = () => isWithinBusinessHours() && !isManuallyClosedToday();
  function syncOrderControls() {
    const closed = !isShopOpen();
    const selector = 'button[onclick*="handleAddToCartClick"], button[onclick*="handleFeaturedClick"], button[onclick*="Food2Suit.addProduct"], button[onclick*="Food2Suit.addToCart"], #modal-confirm-btn, #sf-customizer-confirm';
    document.querySelectorAll(selector).forEach(button => {
      if (closed) {
        button.disabled = true;
        button.dataset.sfOrderDisabled = 'true';
        button.title = 'Food2Suit is currently closed for new orders.';
        button.classList.add('opacity-50', 'cursor-not-allowed');
      } else if (button.dataset.sfOrderDisabled === 'true') {
        button.disabled = false;
        delete button.dataset.sfOrderDisabled;
        button.removeAttribute('title');
        button.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }
function showShopStatus() {
  document.getElementById('sf-shop-status')?.remove();
  const header = document.querySelector('header');
  header?.style.removeProperty('top');
  syncOrderControls();
  if (isShopOpen()) return;
  const hours = shopInfo().regularHours || 'Daily, 8:00 AM – 6:00 PM';
  document.body.insertAdjacentHTML('afterbegin', `<div id="sf-shop-status" role="status" style="position:relative;z-index:60;background:#7c2d12;color:#fff;padding:10px 18px;text-align:center;font:700 13px system-ui">Food2Suit is currently closed for new orders. Regular hours: ${hours}.</div>`);
  const statusBar = document.getElementById('sf-shop-status');
  // The home header is absolutely positioned over the hero. Move it below the
  // notice so the notice remains above the navigation rather than covering it.
  if (header && getComputedStyle(header).position === 'absolute') {
    header.style.top = `${statusBar?.offsetHeight || 0}px`;
  }
}
  async function refreshShopStatus() {
    const client = window.Food2SuitDB?.client;
    if (!client) return showShopStatus();
    try {
      const { data, error } = await client.from('site_settings').select('setting_value').eq('setting_key', 'storefront').maybeSingle();
      if (!error && data?.setting_value) {
        localStorage.setItem('food2suit_registry_meta', JSON.stringify({ ...shopInfo(), ...data.setting_value }));
      }
    } catch (_) { /* Keep the most recently known shop status when offline. */ }
    showShopStatus();
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
    if (!isShopOpen()) return alert('Food2Suit is currently closed for new orders. Our regular hours are 8:00 AM to 6:00 PM.');
    const cart = getCart();
    const cartId = item.cartId || `${item.id}-${item.option || ''}`;
    const existing = cart.find(entry => entry.cartId === cartId);
    if (existing) existing.qty += item.qty || 1;
    else cart.push({ id: item.id, cartId, name: item.name, price: Number(item.price), qty: item.qty || 1, option: item.option || '' });
    saveCart(cart); renderCart();
  }

  function openCheckout() {
    if (!isShopOpen()) return alert('Food2Suit is currently closed for new orders. Our regular hours are 8:00 AM to 6:00 PM.');
    if (!getCart().length) return alert('Your tray is empty.');
    if (!location.pathname.endsWith('/checkout.html')) location.href = 'checkout.html';
  }
  async function submitCheckout(event) {
    event.preventDefault();
    const cart = getCart(), form = event.target, button = form.querySelector('button[type="submit"]');
    const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    button.disabled = true; button.textContent = 'Placing order…';
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const { data: order, error } = await window.Food2SuitDB.client.from('orders').insert({ customer_name: values.name, phone: values.phone, email: values.email || null, delivery_address: values.address, notes: values.notes || null, total }).select('id').single();
      if (error) throw error;
      const { error: itemsError } = await window.Food2SuitDB.client.from('order_items').insert(cart.map(item => ({ order_id: order.id, product_name: item.name, unit_price: Number(item.price), quantity: item.qty, selected_options: item.option ? [{ name: item.option }] : [] })));
      if (itemsError) throw itemsError;
      saveCart([]); renderCart(); form.reset(); document.getElementById('sf-checkout').classList.remove('open'); alert('Order received! Food2Suit will contact you shortly.');
    } catch (_) { alert('We could not place your order yet. Please try again.'); }
    finally { button.disabled = false; button.textContent = 'Place order'; }
  }

  function closeCustomizer() { document.getElementById('sf-customizer')?.classList.remove('open'); }
  function addProduct(product) {
    if (!isShopOpen()) return alert('Food2Suit is currently closed for new orders. Our regular hours are 8:00 AM to 6:00 PM.');
    const options = (product.options || []).map(optionData);
    if (!options.length) return addToCart(product);
    const modal = document.getElementById('sf-customizer');
    document.getElementById('sf-customizer-image').src = product.img || product.image_url || '';
    document.getElementById('sf-customizer-image').alt = product.name;
    document.getElementById('sf-customizer-title').textContent = product.name;
    document.getElementById('sf-customizer-base').textContent = `Base price: ${money(product.price)}`;
    const choices = document.getElementById('sf-customizer-options');
    choices.innerHTML = `<label class="sf-option active"><input type="radio" name="sf-side" value="-1" checked><span><b>No extra side</b><small>Keep it as served</small></span><strong>Included</strong></label>` + options.map((side, i) => `<label class="sf-option"><input type="radio" name="sf-side" value="${i}"><span><b>${side.name}</b><small>Added to your dish</small></span><strong>+ ${money(side.price)}</strong></label>`).join('');
    choices.querySelectorAll('.sf-option').forEach(label => label.addEventListener('change', () => choices.querySelectorAll('.sf-option').forEach(x => x.classList.toggle('active', x.querySelector('input').checked))));
    if (!document.getElementById('sf-customizer-quantity')) {
      document.getElementById('sf-customizer-confirm').insertAdjacentHTML('beforebegin', '<div class="sf-quantity"><button id="sf-customizer-minus" type="button" aria-label="Reduce quantity">−</button><b id="sf-customizer-quantity">1</b><button id="sf-customizer-plus" type="button" aria-label="Increase quantity">+</button></div>');
    }
    let quantity = 1;
    const quantityValue = document.getElementById('sf-customizer-quantity');
    document.getElementById('sf-customizer-minus').onclick = () => { quantity = Math.max(1, quantity - 1); quantityValue.textContent = quantity; };
    document.getElementById('sf-customizer-plus').onclick = () => { quantity += 1; quantityValue.textContent = quantity; };
    document.getElementById('sf-customizer-confirm').onclick = () => {
      const chosen = Number(choices.querySelector('input:checked').value);
      const side = chosen >= 0 ? options[chosen] : null;
      addToCart({ ...product, name: side ? `${product.name} — ${side.name}` : product.name, price: Number(product.price) + (side?.price || 0), option: side?.name || '', qty: quantity });
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

  function addMobileNavigation() {
    if (document.getElementById('sf-mobile-nav')) return;
    const current = location.pathname.split('/').pop() || 'index.html';
    const links = [['index.html', 'Home', '⌂'], ['menu.html', 'Menu', '☰'], ['offers.html', 'Offers', '✦'], ['contact.html', 'Contact', '✉']];
    document.body.insertAdjacentHTML('beforeend', `<nav id="sf-mobile-nav" aria-label="Mobile page navigation">${links.map(([href, label, icon]) => `<a href="${href}" class="${current === href ? 'active' : ''}"><span>${icon}</span>${label}</a>`).join('')}</nav>`);
  }

  function addReviewForm() {
    const homeExtras = document.getElementById('sf-home-extras');
    if (!homeExtras || document.getElementById('sf-review-form')) return;
    homeExtras.insertAdjacentHTML('beforeend', `<section class="sf-review-form-wrap"><div><p class="sf-kicker">Share your experience</p><h2>Enjoyed your Food2Suit meal?</h2><p>Leave a short review for other customers.</p></div><form id="sf-review-form"><input id="sf-review-name" required maxlength="40" placeholder="Your name"><select id="sf-review-rating" aria-label="Rating"><option value="5">★★★★★ — 5 stars</option><option value="4">★★★★☆ — 4 stars</option><option value="3">★★★☆☆ — 3 stars</option></select><textarea id="sf-review-message" required maxlength="220" placeholder="Tell us about your meal"></textarea><button>Post review</button></form></section>`);
    const reviewKey = 'food2suit_customer_reviews';
    const renderReviews = async () => {
      let reviews = JSON.parse(localStorage.getItem(reviewKey) || '[]');
      try {
        if (window.Food2SuitDB?.enabled) reviews = (await window.Food2SuitDB.approvedReviews()).map(review => ({ name: review.customer_name, rating: review.rating, message: review.message }));
      } catch (_) { /* The local display remains available when offline. */ }
      const testimonialGrid = document.querySelector('.sf-testimonial-grid');
      if (!testimonialGrid) return;
      testimonialGrid.querySelectorAll('[data-customer-review]').forEach(review => review.remove());
      const emptyState = testimonialGrid.querySelector('#sf-no-reviews');
      if (emptyState) emptyState.remove();
      if (!reviews.length) {
        testimonialGrid.innerHTML = '<p id="sf-no-reviews" class="sf-no-reviews">Approved customer reviews will appear here.</p>';
        return;
      }
      testimonialGrid.insertAdjacentHTML('beforeend', reviews.slice(-3).reverse().map(review => {
        const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const message = String(review.message || '').replace(/[<>&]/g, '');
        const name = String(review.name || 'Food2Suit customer').replace(/[<>&]/g, '');
        return `<figure class="sf-customer-review" data-customer-review><b class="sf-review-stars" aria-label="${rating} out of 5 stars">${stars}</b><br>“${message}”<figcaption>— ${name}</figcaption></figure>`;
      }).join(''));
    };
    document.getElementById('sf-review-form').addEventListener('submit', async event => {
      event.preventDefault();
      const review = { name: document.getElementById('sf-review-name').value.trim(), rating: Number(document.getElementById('sf-review-rating').value), message: document.getElementById('sf-review-message').value.trim() };
      const button = event.target.querySelector('button[type="submit"], button:not([type])');
      if (window.Food2SuitDB?.enabled) {
        button.disabled = true; button.textContent = 'Sending…';
        try {
          await window.Food2SuitDB.submitReview(review);
          event.target.reset(); button.textContent = 'Submitted for approval';
          setTimeout(() => { button.disabled = false; button.textContent = 'Post review'; }, 2200);
          return;
        } catch (_) { button.disabled = false; button.textContent = 'Post review'; }
      }
      const reviews = JSON.parse(localStorage.getItem(reviewKey) || '[]');
      reviews.push(review);
      localStorage.setItem(reviewKey, JSON.stringify(reviews)); event.target.reset(); renderReviews();
    });
    renderReviews();
  }

  function upgradeReviewForm() {
    const form = document.getElementById('sf-review-form');
    const select = document.getElementById('sf-review-rating');
    if (!form || !select || document.getElementById('sf-stars')) return;
    select.style.display = 'none';
    select.innerHTML = [1,2,3,4,5].map(value => `<option value="${value}">${value}</option>`).join('');
    const stars = document.createElement('div');
    stars.id = 'sf-stars'; stars.className = 'sf-stars'; stars.setAttribute('role', 'radiogroup');
    stars.innerHTML = `${[1,2,3,4,5].map(value => `<button type="button" aria-label="${value} star${value > 1 ? 's' : ''}" data-rating="${value}">★</button>`).join('')}<span class="sf-star-caption">Select your rating</span>`;
    select.parentNode.insertBefore(stars, select);
    const setRating = value => {
      select.value = String(value);
      stars.querySelectorAll('button').forEach(button => button.classList.toggle('active', Number(button.dataset.rating) <= value));
      stars.querySelector('.sf-star-caption').textContent = `${value} out of 5 stars`;
    };
    stars.querySelectorAll('button').forEach(button => button.addEventListener('click', () => setRating(Number(button.dataset.rating))));
    setRating(5);
  }

  function upgradeFooter() {
    const footer = document.querySelector('.sf-footer');
    if (!footer) return;
    const info = JSON.parse(localStorage.getItem('food2suit_registry_meta') || '{}');
    const whatsapp = (info.whatsapp || info.phone || '+233501234567').replace(/[^0-9]/g, '');
    footer.innerHTML = `<section><h3>Food2Suit</h3><a href="menu.html">Our Menu</a><a href="index.html#sf-about">Our Taste Guarantee</a><a href="index.html#sf-about">About Food2Suit</a></section><section><h3>Contact Food2Suit</h3><a href="contact.html">Contact Us</a><a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">WhatsApp</a></section><section><h3>Legal</h3><a href="terms.html">Terms of Use</a><a href="privacy.html">Privacy Policy</a></section><p class="sf-copy">© 2026 Food2Suit. Everything Food.</p>`;
  }

  function applySharedContent() {
    const info = JSON.parse(localStorage.getItem('food2suit_registry_meta') || '{}');
    const about = document.querySelector('.sf-about > p');
    if (about && info.about) about.textContent = info.about;
  }

  function addGuaranteeSection() {
    const homeExtras = document.getElementById('sf-home-extras');
    if (!homeExtras || document.getElementById('sf-guarantee')) return;
    const about = homeExtras.querySelector('.sf-about');
    if (about) about.id = 'sf-about';
    homeExtras.insertAdjacentHTML('afterbegin', `<section id="sf-guarantee" class="sf-guarantee"><div><p class="sf-kicker">Our Taste Guarantee</p><h2>Good food, handled with care.</h2><p>We prepare every Food2Suit meal with the care we would expect for our own table.</p></div><div class="sf-guarantee-grid"><article><span>🌿</span><h3>Fresh ingredients</h3><p>We focus on quality ingredients and thoughtful preparation.</p></article><article><span>🛡</span><h3>Hygienic preparation</h3><p>Clean kitchen practices are part of every meal we serve.</p></article><article><span>🛵</span><h3>Reliable delivery</h3><p>We work to get your food to you hot, fresh and on time.</p></article></div></section>`);
  }

  function makeFooterAnchorsWork() {
    document.querySelectorAll('.sf-footer a').forEach(link => {
      if (link.textContent.trim() === 'Our Taste Guarantee') link.href = 'index.html#sf-guarantee';
      if (link.textContent.trim() === 'About Food2Suit') link.href = 'index.html#sf-about';
    });
    if (location.hash === '#sf-guarantee' || location.hash === '#sf-about') setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function addHomeSections() {
    const onHome = /(^|\/)index\.html$/.test(location.pathname) || /Food2suit\.com\/$/.test(location.pathname);
    if (!onHome || document.getElementById('sf-home-extras')) return;
    const anchor = document.querySelector('#view-home') || document.querySelector('main');
    anchor.insertAdjacentHTML('beforeend', `<div id="sf-home-extras" class="sf-home-extras"><section class="sf-about"><div><p class="sf-kicker">About Food2Suit</p><h2>Food that feels like home.</h2></div><p>From everyday meals to celebrations, Food2Suit brings trusted local flavour, quality ingredients, and warm service to every order.</p></section><section class="sf-testimonials"><p class="sf-kicker">Customer love</p><h2>What our customers say</h2><div class="sf-testimonial-grid"><p id="sf-no-reviews" class="sf-no-reviews">Approved customer reviews will appear here.</p></div></section></div>`);
  }

  window.Food2Suit = {
    addToCart,
    addProduct,
    checkout: openCheckout,
    submitCheckout,
    formatMoney: money,
    normalizeOption: optionData,
    changeQty(cartId, delta) { if (delta > 0 && !isShopOpen()) return alert('Food2Suit is currently closed for new orders.'); const cart = getCart(); const item = cart.find(entry => entry.cartId === cartId); if (item) item.qty += delta; saveCart(cart.filter(entry => entry.qty > 0)); renderCart(); },
    toggleCart() { document.getElementById('sf-cart-drawer')?.classList.toggle('open'); },
    isShopOpen,
    toggleTheme() { localStorage.setItem(THEME_KEY, document.documentElement.classList.contains('dark') ? 'light' : 'dark'); applyTheme(); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('link[href="enhancements.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="enhancements.css">');
    if (!document.querySelector('link[href="footer-review.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="footer-review.css">');
    if (!document.querySelector('link[href="guarantee.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="guarantee.css">');
    applyTheme(); ensureHeaderControls(); addHomeSections(); addGuaranteeSection(); addReviewForm(); upgradeReviewForm(); addFooter(); upgradeFooter(); applySharedContent(); addMobileNavigation(); makeFooterAnchorsWork(); refreshShopStatus();
    if (location.pathname.endsWith('/offers.html')) document.body.classList.add('sf-offers');
    document.body.insertAdjacentHTML('beforeend', `<aside id="sf-cart-drawer" aria-label="Food tray"><div class="sf-cart-head"><b>Your Food Tray</b><button onclick="Food2Suit.toggleCart()" aria-label="Close">×</button></div><div id="sf-cart-items"></div><div class="sf-cart-foot"><span>Total</span><b id="sf-cart-total">GH₵ 0.00</b><button onclick="Food2Suit.checkout()">Checkout</button></div></aside><div id="sf-customizer" role="dialog" aria-modal="true"><div class="sf-customizer-backdrop" onclick="document.getElementById('sf-customizer').classList.remove('open')"></div><div class="sf-customizer-box"><button class="sf-modal-close" onclick="document.getElementById('sf-customizer').classList.remove('open')" aria-label="Close">×</button><div class="sf-customizer-layout"><div class="sf-customizer-media"><img id="sf-customizer-image" alt="Selected dish"></div><div><p class="sf-kicker">Make it yours</p><h2 id="sf-customizer-title"></h2><p id="sf-customizer-base"></p><div id="sf-customizer-options"></div><button id="sf-customizer-confirm" class="sf-confirm">Add to tray</button></div></div></div></div>`);
    renderCart();
    document.querySelector('#sf-cart-drawer .sf-cart-foot button').onclick = openCheckout;
    new MutationObserver(() => { if (!isShopOpen()) syncOrderControls(); }).observe(document.body, { childList: true, subtree: true });
  });
})();
