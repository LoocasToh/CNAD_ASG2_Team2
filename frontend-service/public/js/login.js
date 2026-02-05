// =========================
// LOGIN PAGE - Care Companion (STANDALONE)
// Includes: toast, loading, validation, accessibility, show-password toggle
// =========================

const AUTH_BASE = window.AUTH_BASE_URL || 'http://localhost:8080/auth';

// Local fallback data
let users = JSON.parse(localStorage.getItem('careCompanionUsers')) || [];

// -------------------------
// UI UTILITIES
// -------------------------
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const toastIcon = toast.querySelector('.toast-icon');
  const toastMessage = toast.querySelector('.toast-message');

  if (toastIcon) {
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
  }

  if (toastMessage) toastMessage.textContent = message;

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function setLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    button.disabled = true;
  } else {
    if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    button.disabled = false;
  }
}

// -------------------------
// VALIDATION
// -------------------------
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
}

// -------------------------
// ACCESSIBILITY + SHOW PASSWORD
// -------------------------
function initAccessibility() {
  document.getElementById('text-size-btn')?.addEventListener('click', () => {
    document.body.classList.toggle('large-text');
    showToast(document.body.classList.contains('large-text') ? 'Large text enabled' : 'Normal text size', 'info');
  });

  document.getElementById('high-contrast-btn')?.addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
    showToast(document.body.classList.contains('high-contrast') ? 'High contrast enabled' : 'High contrast disabled', 'info');
  });

  document.getElementById('read-aloud-btn')?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis not supported in your browser', 'error');
      return;
    }
    const pageTitle = document.title;
    const mainContent = document.querySelector('main') || document.body;
    const text = mainContent.innerText;
    const speech = new SpeechSynthesisUtterance();
    speech.text = `${pageTitle}. ${text}`;
    window.speechSynthesis.speak(speech);
  });

  // eye toggle
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

// -------------------------
// SESSION CHECK
// -------------------------
function checkExistingSession() {
  const user =
    JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser'));

  if (user) {
    showToast('You are already logged in. Redirecting...', 'info');
    setTimeout(() => (window.location.href = 'DailyTasks.html'), 1000);
  }
}

// -------------------------
// LOGIN
// -------------------------
function initDemoAccount() {
  // optional
}

function handleSocialLogin(provider) {
  showToast(`Signing in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`, 'info');
  setTimeout(() => showToast('Social login coming soon!', 'info'), 1000);
}

async function handleLogin() {
  const usernameInput = document.getElementById('UsernameInput');
  const passwordInput = document.getElementById('PasswordInput');
  const rememberMe = document.getElementById('remember-me');
  const loginButton = document.getElementById('LoginButton');

  if (!usernameInput || !passwordInput || !loginButton) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username) {
    showToast('Please enter your username or email', 'error');
    usernameInput.focus();
    return;
  }

  if (!password) {
    showToast('Please enter your password', 'error');
    passwordInput.focus();
    return;
  }

  setLoading(loginButton, true);

  try {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
      const displayName = data.name || data.username || username.split('@')[0];

      const user = {
        id: data.userId,
        email: username,
        userType: data.userType,
        name: displayName,
      };

      localStorage.setItem('careCompanionToken', data.token);

      if (rememberMe?.checked) {
        localStorage.setItem('careCompanionRemember', 'true');
        localStorage.setItem('careCompanionUser', JSON.stringify(user));
      } else {
        sessionStorage.setItem('careCompanionUser', JSON.stringify(user));
      }

      showToast('Welcome back!', 'success');
      setTimeout(() => (window.location.href = 'DailyTasks.html'), 1500);
    } else {
      handleLocalLogin(username, password, rememberMe?.checked);
    }
  } catch (error) {
    console.error('Login error:', error);
    handleLocalLogin(username, password, rememberMe?.checked);
  } finally {
    setLoading(loginButton, false);
  }
}

function loginSuccess(user, rememberMe) {
  const { password, ...userWithoutPassword } = user;

  if (rememberMe) localStorage.setItem('careCompanionUser', JSON.stringify(userWithoutPassword));
  else sessionStorage.setItem('careCompanionUser', JSON.stringify(userWithoutPassword));

  const exists = users.some(u => u.id === user.id);
  if (!exists) {
    users.push(user);
    localStorage.setItem('careCompanionUsers', JSON.stringify(users));
  }

  showToast(`Welcome back, ${userWithoutPassword.name || userWithoutPassword.username || 'User'}!`, 'success');
  setTimeout(() => (window.location.href = 'DailyTasks.html'), 1500);
}

function handleLocalLogin(username, password, rememberMe) {
  setTimeout(() => {
    if (username === 'demo@care.com' && password === 'demo123') {
      loginSuccess(
        { id: 'demo-001', username: 'demo_user', email: 'demo@care.com', role: 'user', name: 'Demo User' },
        rememberMe
      );
      return;
    }

    const user = users.find(
      u => (u.email === username || u.username === username) && u.password === password
    );

    if (user) {
      loginSuccess(user, rememberMe);
    } else {
      showToast('Invalid username or password', 'error');

      const usernameInput = document.getElementById('UsernameInput');
      const passwordInput = document.getElementById('PasswordInput');
      usernameInput?.classList.add('invalid');
      passwordInput?.classList.add('invalid');

      setTimeout(() => {
        usernameInput?.classList.remove('invalid');
        passwordInput?.classList.remove('invalid');
      }, 1000);
    }
  }, 500);
}

function initLoginPage() {
  initAccessibility();

  const loginForm = document.getElementById('login-form');
  const demoInfo = document.querySelector('.demo-info');

  if (demoInfo) {
    const usernameInput = document.getElementById('UsernameInput');
    const passwordInput = document.getElementById('PasswordInput');
    if (usernameInput && passwordInput) {
      usernameInput.value = 'demo@care.com';
      passwordInput.value = 'demo123';
    }
  }

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    handleLogin();
  });

  document.querySelector('.google-btn')?.addEventListener('click', handleSocialLogin.bind(null, 'google'));
  document.querySelector('.apple-btn')?.addEventListener('click', handleSocialLogin.bind(null, 'apple'));

  document.querySelector('.forgot-password')?.addEventListener('click', e => {
    e.preventDefault();
    showToast('Password reset feature coming soon!', 'info');
  });

  initDemoAccount();
  checkExistingSession();

  // Fade-in
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s ease';
  setTimeout(() => (document.body.style.opacity = '1'), 50);
}

// Init
document.addEventListener('DOMContentLoaded', initLoginPage);

// Backward compatibility
window.login = handleLogin;
window.handleLogin = handleLogin;
window.showToast = showToast;
window.setLoading = setLoading;
