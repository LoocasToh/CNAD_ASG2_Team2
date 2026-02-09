// =========================
// LOGIN PAGE - Care Companion (BACKEND AUTH)
// Fixes: userId must be numeric (MySQL INT)
// - calls auth-service instead of fake local users
// - stores token + user from backend
// =========================

const AUTH_BASE = window.AUTH_BASE_URL || 'http://localhost:8080/auth';

// (Optional) still keep local users array so your page doesn't crash if referenced,
// but we won't use it for login anymore.
let users = JSON.parse(localStorage.getItem('careCompanionUsers')) || [];

// =========================
// UTILITY FUNCTIONS
// =========================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const toastIcon = toast.querySelector('.toast-icon');
  const toastMessage = toast.querySelector('.toast-message');

  if (type === 'success') {
    toastIcon.className = 'fas fa-check-circle toast-icon';
    toastIcon.style.color = '#8affc1';
  } else if (type === 'error') {
    toastIcon.className = 'fas fa-exclamation-circle toast-icon';
    toastIcon.style.color = '#ff6b6b';
  } else {
    toastIcon.className = 'fas fa-info-circle toast-icon';
    toastIcon.style.color = '#a8c0ff';
  }

  toastMessage.textContent = message;
  toast.classList.add('show');

  setTimeout(() => toast.classList.remove('show'), 3000);
}

function setLoading(button, isLoading) {
  if (!button) return;

  if (isLoading) {
    const originalText = button.innerHTML;
    button.dataset.originalText = originalText;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    button.disabled = true;
  } else {
    const originalText = button.dataset.originalText;
    if (originalText) button.innerHTML = originalText;
    button.disabled = false;
  }
}

function checkPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}

// =========================
// ACCESSIBILITY
// =========================
function initAccessibility() {
  document.getElementById('text-size-btn')?.addEventListener('click', () => {
    document.body.classList.toggle('large-text');
    showToast(document.body.classList.contains('large-text') ? 'Large text enabled' : 'Normal text size', 'info');
  });

  document.getElementById('high-contrast-btn')?.addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
    showToast(document.body.classList.contains('high-contrast') ? 'High contrast enabled' : 'High contrast disabled', 'info');
  });

  // show password toggle
  document.querySelectorAll('.show-password')?.forEach(btn => {
    btn.addEventListener('click', function () {
      const input = this.previousElementSibling;
      const icon = this.querySelector('i');
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
        this.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
        this.setAttribute('aria-label', 'Show password');
      }
    });
  });
}

// =========================
// SESSION HELPERS
// =========================
function storeSession({ token, user }, rememberMe) {
  if (token) localStorage.setItem('careCompanionToken', token);

  // MUST store numeric id from backend (MySQL users.id INT)
  if (!user || !Number.isFinite(Number(user.id))) {
    throw new Error(`Login succeeded but user.id is not numeric: ${user?.id}`);
  }

  if (rememberMe) {
    localStorage.setItem('careCompanionUser', JSON.stringify(user));
    localStorage.setItem('careCompanionRemember', 'true');
    sessionStorage.removeItem('careCompanionUser');
  } else {
    sessionStorage.setItem('careCompanionUser', JSON.stringify(user));
    localStorage.removeItem('careCompanionUser');
    localStorage.removeItem('careCompanionRemember');
  }
}

function clearOldBadSessions() {
  // If you previously had demo/social/local users, wipe them to stop conflicts
  const u1 = localStorage.getItem('careCompanionUser');
  const u2 = sessionStorage.getItem('careCompanionUser');

  const parsed1 = u1 ? safeJson(u1) : null;
  const parsed2 = u2 ? safeJson(u2) : null;

  const bad =
    (parsed1 && !Number.isFinite(Number(parsed1.id))) ||
    (parsed2 && !Number.isFinite(Number(parsed2.id)));

  if (bad) {
    localStorage.removeItem('careCompanionUser');
    sessionStorage.removeItem('careCompanionUser');
    localStorage.removeItem('careCompanionToken');
    localStorage.removeItem('careCompanionRemember');
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// =========================
// API
// =========================
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

// =========================
// LOGIN FLOW
// =========================
function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  // Password strength indicator (only if you have strength-bar/text in your HTML)
  const passwordInput = document.getElementById('PasswordInput');
  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      const strength = checkPasswordStrength(this.value);
      const strengthBar = document.querySelector('.strength-bar');
      const strengthText = document.querySelector('.strength-text');

      if (strengthBar && strengthText) {
        strengthBar.className = 'strength-bar ' + strength;
        strengthText.textContent = strength.charAt(0).toUpperCase() + strength.slice(1) + ' password';
      }
    });
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });

  // Social login buttons: for now, disable (your backend doesn't support OAuth)
  document.querySelector('.google-btn')?.addEventListener('click', () => {
    showToast('Google login not implemented (backend required).', 'info');
  });
  document.querySelector('.apple-btn')?.addEventListener('click', () => {
    showToast('Apple login not implemented (backend required).', 'info');
  });
}


async function handleLogin() {
  const usernameInput = document.getElementById('UsernameInput');
  const passwordInput = document.getElementById('PasswordInput');
  const rememberMe = document.getElementById('remember-me');
  const loginButton = document.getElementById('LoginButton');

  const email = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showToast('Enter email and password', 'error');
    return;
  }

  setLoading(loginButton, true);

  try {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || data.message || 'Login failed', 'error');
      setLoading(loginButton, false);
      return;
    }

    // IMPORTANT: store token
    localStorage.setItem('careCompanionToken', data.token);

    // IMPORTANT: store numeric id for tasks.userId INT
    const userObj = {
      id: Number(data.userId),         // numeric
      email,
      userType: data.userType,
      name: data.userName || email.split('@')[0],
    };

    if (!Number.isFinite(userObj.id)) {
  showToast('Backend returned invalid userId (must be numeric).', 'error');
  return;
}

    if (rememberMe?.checked) {
      localStorage.setItem('careCompanionUser', JSON.stringify(userObj));
    } else {
      sessionStorage.setItem('careCompanionUser', JSON.stringify(userObj));
    }

    showToast('Login success!', 'success');

// ✅ redirect based on userType
const redirect = userObj.userType === 'caregiver'
  ? '/HTML/caregiver.html'
  : '/DailyTasks.html';

setTimeout(() => {
  window.location.href = redirect;
}, 800);
  } catch (err) {
    console.error(err);
    showToast('Network error contacting auth service', 'error');
  } finally {
    setLoading(loginButton, false);
  }
}


// =========================
// INITIALIZATION
// =========================
document.addEventListener('DOMContentLoaded', function () {
  console.log('Login Page Initialized');

  // clean old non-numeric sessions
  clearOldBadSessions();

  initAccessibility();
  initLoginPage();

  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s ease';
  setTimeout(() => (document.body.style.opacity = '1'), 50);
});

window.addEventListener('error', function (e) {
  console.error('Login page error:', e.error);
  showToast('An error occurred. Please try again.', 'error');
});