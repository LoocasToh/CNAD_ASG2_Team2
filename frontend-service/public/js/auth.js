// =========================
// auth-shared.js
// =========================

window.AUTH_BASE_URL = window.AUTH_BASE_URL || 'http://localhost:8080/auth';
const AUTH_BASE = window.AUTH_BASE_URL;

// Use ONE token key everywhere
const TOKEN_KEY = 'auth_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('auth_user');
}

// profile
async function loadProfile() {
  const token = getToken();
  if (!token) {
    window.location.href = '/index.html';
    return null;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Unauthorized');

    const data = await res.json();

    // store + event (your original behavior)
    localStorage.setItem('auth_user', JSON.stringify(data));
    document.dispatchEvent(new CustomEvent('userDataStored', { detail: data }));

    return data;
  } catch (err) {
    clearToken();
    window.location.href = '/index.html';
    return null;
  }
}

// page guard
async function protectPages(pages) {
  const currentPage = window.location.pathname.split('/').pop();
  if (pages.includes(currentPage)) {
    await loadProfile();
  }
}

function handleLogout(e) {
  if (e) e.preventDefault();

  // remove ALL possible session keys you used
  localStorage.removeItem('careCompanionToken');
  localStorage.removeItem('careCompanionUser');
  localStorage.removeItem('careCompanionRemember');

  sessionStorage.removeItem('careCompanionUser');

  // if you also used these in other files
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');

  showToast('Logged out', 'info');

  setTimeout(() => {
    window.location.href = 'LoginScreen.html'; // change if your login page name differs
  }, 300);
}

window.handleLogout = handleLogout;


// expose globally
window.auth = {
  AUTH_BASE,
  getToken,
  setToken,
  clearToken,
  loadProfile,
  protectPages,
};
