/* Secure the static admin console with Supabase Auth and the staff RLS role. */
(function () {
  const db = window.Food2SuitDB?.client;
  const inactivityMs = 30 * 60 * 1000;
  let inactivityTimer;
  document.documentElement.classList.add('sf-admin-auth-pending');
  const style = document.createElement('style');
  style.textContent = `.sf-admin-auth-pending body>*{visibility:hidden}.sf-admin-login{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:#111827;color:#fff;font-family:system-ui,sans-serif}.sf-admin-login form{width:min(100%,390px);background:#fff;color:#111827;border-radius:24px;padding:30px;box-shadow:0 24px 80px #0008}.sf-admin-login h1{margin:0 0 8px;font-size:26px}.sf-admin-login p{color:#6b7280;font-size:14px;line-height:1.5}.sf-admin-login input{width:100%;box-sizing:border-box;margin-top:12px;padding:13px;border:1px solid #d1d5db;border-radius:12px}.sf-admin-login button{width:100%;border:0;border-radius:12px;padding:13px;background:#ff6b35;color:#fff;font-weight:800;margin-top:14px;cursor:pointer}.sf-admin-login small{display:block;min-height:20px;margin-top:12px;color:#b91c1c}`;
  document.head.appendChild(style);

  const isAdmin = async () => {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return false;
    const { data } = await db.from('staff').select('is_admin').eq('user_id', session.user.id).maybeSingle();
    return Boolean(data?.is_admin);
  };
  const showLogin = () => {
    document.documentElement.classList.remove('sf-admin-auth-pending');
    const view = document.createElement('section');
    view.className = 'sf-admin-login';
    view.innerHTML = `<form><h1>Food2Suit Admin</h1><p>Sign in with your approved administrator account.</p><input type="email" required autocomplete="email" placeholder="Email address"><input type="password" required autocomplete="current-password" placeholder="Password"><button>Sign in</button><small aria-live="polite"></small></form>`;
    document.body.appendChild(view);
    view.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const [email, password] = view.querySelectorAll('input'); const button = view.querySelector('button'), message = view.querySelector('small');
      button.disabled = true; button.textContent = 'Signing in…'; message.textContent = '';
      const { error } = await db.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      if (error || !(await isAdmin())) { await db.auth.signOut(); message.textContent = error?.message || 'This account is not an administrator.'; button.disabled = false; button.textContent = 'Sign in'; return; }
      view.remove(); document.documentElement.classList.remove('sf-admin-auth-pending'); addSignOut(); startInactivityTimer();
    });
  };
  const addSignOut = () => {
    if (document.getElementById('sf-admin-signout')) return;
    const button = document.createElement('button');
    button.id = 'sf-admin-signout'; button.type = 'button'; button.textContent = 'Sign out';
    button.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9998;background:#111827;color:#fff;border:1px solid #374151;border-radius:999px;padding:10px 16px;font:700 13px system-ui;cursor:pointer;box-shadow:0 8px 24px #0004';
    button.addEventListener('click', async () => { await db.auth.signOut(); location.reload(); });
    document.body.appendChild(button);
  };
  const startInactivityTimer = () => {
    const reset = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        await db.auth.signOut();
        sessionStorage.setItem('food2suit_admin_timeout', '1');
        location.reload();
      }, inactivityMs);
    };
    ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach(event => document.addEventListener(event, reset, { passive: true }));
    reset();
  };
  document.addEventListener('DOMContentLoaded', async () => {
    if (!db || !(await isAdmin())) showLogin();
    else { document.documentElement.classList.remove('sf-admin-auth-pending'); addSignOut(); startInactivityTimer(); }
  });
})();
