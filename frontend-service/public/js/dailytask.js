// =========================
// DailyTasks Header Auth UI
// - Show username in header (Guest -> name/email)
// - Logout click handler
// =========================

// OPTIONAL: If handleLogout is NOT defined elsewhere (auth-shared.js),
// keep this here. If you already have handleLogout in auth-shared.js,
// you can delete this function.
function handleLogout(e) {
  if (e) e.preventDefault();

  localStorage.removeItem('careCompanionToken');
  localStorage.removeItem('careCompanionUser');
  localStorage.removeItem('careCompanionRemember');
  sessionStorage.removeItem('careCompanionUser');

  // optional cleanup
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');

  // redirect
  window.location.href = 'LoginScreen.html';
}

// Put user name into the "Guest" label
function renderUserName() {
  const el = document.getElementById('headerUserName');
  if (!el) return;

  const user =
    JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser'));

  // Prefer name -> username -> email -> Guest
  let label = user?.name || user?.username || user?.email || 'Guest';

  // If it's an email, show only front part (optional nicer UI)
  if (typeof label === 'string' && label.includes('@')) {
    label = label.split('@')[0];
  }

  el.textContent = label;
}

// (Optional but good) Protect this page: if no session, go login
function requireLogin() {
  const user =
    JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser'));

  // If you prefer checking token instead, change this logic
  if (!user) {
    window.location.href = 'LoginScreen.html';
    return false;
  }
  return true;
}

// Make available globally if you want to call it from other scripts
window.renderUserName = renderUserName;

document.addEventListener('DOMContentLoaded', () => {
  // If this is a protected page, ensure logged in first
  if (!requireLogin()) return;

  // Render name immediately from storage
  renderUserName();

  // Hook logout click
  document.getElementById('logout-link')?.addEventListener('click', handleLogout);
});
