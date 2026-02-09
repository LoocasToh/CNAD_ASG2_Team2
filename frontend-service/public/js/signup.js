// =========================
// SIGN UP PAGE - Care Companion (BACKEND REQUIRED)
// Fixes:
// - Avoid AUTH_BASE redeclare (auth.js already declares it)
// - Requires backend to return numeric user.id
// =========================

// IMPORTANT: do NOT use const AUTH_BASE here (auth.js already declares it)
const AUTH_URL = window.AUTH_BASE_URL || 'http://localhost:8080/auth';

// local-only lists (for UI checks only; not real auth)
let users = JSON.parse(localStorage.getItem('careCompanionUsers')) || [];
let tasks = JSON.parse(localStorage.getItem('careCompanionTasks')) || [];

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
  // If user comes to SignUp page, they want to create a NEW account.
  // So clear any previous session to stop auto-redirect.
  localStorage.removeItem('careCompanionToken');
  localStorage.removeItem('careCompanionUser');
  localStorage.removeItem('careCompanionRemember');

  sessionStorage.removeItem('careCompanionUser');

  // Optional: if you used other keys before
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

// -------------------------
// SIGNUP UI HELPERS
// -------------------------
function updatePasswordStrength() {
  const passwordInput = document.getElementById('PasswordInput');
  const strengthBar = document.querySelector('.strength-bar');
  const strengthText = document.querySelector('.strength-text');
  if (!passwordInput || !strengthBar || !strengthText) return;

  const strength = checkPasswordStrength(passwordInput.value);
  strengthBar.className = 'strength-bar ' + strength;
  strengthText.textContent = strength.charAt(0).toUpperCase() + strength.slice(1) + ' password';
}

function validatePasswordMatch() {
  const passwordInput = document.getElementById('PasswordInput');
  const confirmPasswordInput = document.getElementById('ConfirmPasswordInput');
  const passwordMatch = document.getElementById('password-match');
  if (!passwordInput || !confirmPasswordInput || !passwordMatch) return;

  if (!confirmPasswordInput.value) {
    passwordMatch.textContent = 'Passwords must match';
    passwordMatch.style.color = '#8a9aa7';
    confirmPasswordInput.classList.remove('valid', 'invalid');
    return;
  }

  if (passwordInput.value === confirmPasswordInput.value) {
    passwordMatch.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match';
    passwordMatch.style.color = '#8affc1';
    confirmPasswordInput.classList.add('valid');
    confirmPasswordInput.classList.remove('invalid');
  } else {
    passwordMatch.innerHTML = '<i class="fas fa-exclamation-circle"></i> Passwords do not match';
    passwordMatch.style.color = '#ff6b6b';
    confirmPasswordInput.classList.add('invalid');
    confirmPasswordInput.classList.remove('valid');
  }
}

function initRoleSelection() {
  const roleOptions = document.querySelectorAll('.role-option');
  const roleSelect = document.getElementById('RoleSelect');
  if (!roleOptions.length || !roleSelect) return;

  roleOptions.forEach(option => {
    option.addEventListener('click', function () {
      roleOptions.forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');
      roleSelect.value = this.dataset.role;
    });
  });

  roleOptions[0]?.classList.add('selected');
}

// -------------------------
// SIGNUP (BACKEND)
// -------------------------
async function handleSignUp(event) {
  event.preventDefault();

  const usernameInput = document.getElementById('UsernameInput');
  const emailInput = document.getElementById('EmailInput');
  const passwordInput = document.getElementById('PasswordInput');
  const confirmPasswordInput = document.getElementById('ConfirmPasswordInput');
  const roleSelect = document.getElementById('RoleSelect');
  const termsAgreement = document.getElementById('termsAgreement');
  const newsletter = document.getElementById('newsletterSubscription');
  const signUpButton = document.getElementById('SignUpButton');

  if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !roleSelect || !termsAgreement || !signUpButton) return;

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const role = roleSelect.value || 'user';

  // Validation
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) return showToast('Username must be 3-20 characters (letters, numbers, underscores only)', 'error');
  if (!validateEmail(email)) return showToast('Please enter a valid email address', 'error');
  if (!validatePassword(password)) return showToast('Password must be at least 8 characters with letters and numbers', 'error');
  if (password !== confirmPassword) return showToast('Passwords do not match', 'error');
  if (!termsAgreement.checked) return showToast('Please agree to the Terms of Service and Privacy Policy', 'error');

  setLoading(signUpButton, true);

  try {
    const formData = {
      username,
      email,
      password,
      userType: role,
      name: username,
      newsletter: newsletter ? newsletter.checked : false,
    };

    const res = await fetch(`${AUTH_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = { message: raw }; }

    if (!res.ok) {
      // 409 = email exists
      const msg = data?.error || data?.message || `Signup failed (${res.status})`;
      showToast(msg, 'error');
      return;
    }

    const newUser = data?.user;
    const token = data?.token;

    if (!newUser || !Number.isFinite(Number(newUser.id))) {
      throw new Error(`Signup succeeded but backend did not return numeric user.id. Got: ${newUser?.id}`);
    }

    if (token) localStorage.setItem('careCompanionToken', token);
    localStorage.setItem('careCompanionUser', JSON.stringify(newUser));

    showToast('Account created successfully!', 'success');
    const redirect =
  role === 'caregiver'
    ? '/HTML/caregiver.html'
    : '/DailyTasks.html';

setTimeout(() => {
  window.location.href = redirect;
}, 800);




  } catch (err) {
    console.error('Signup error:', err);
    showToast(err.message || 'Signup failed. Check auth-service.', 'error');
  } finally {
    setLoading(signUpButton, false);
  }
}

function initSignUpPage() {
  initAccessibility();

  document.getElementById('signupForm')?.addEventListener('submit', handleSignUp);

  document.getElementById('PasswordInput')?.addEventListener('input', updatePasswordStrength);
  document.getElementById('PasswordInput')?.addEventListener('input', validatePasswordMatch);
  document.getElementById('ConfirmPasswordInput')?.addEventListener('input', validatePasswordMatch);

  initRoleSelection();
  checkExistingSession();

  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s ease';
  setTimeout(() => (document.body.style.opacity = '1'), 50);
}

document.addEventListener('DOMContentLoaded', initSignUpPage);

// Backward compatibility
window.signup = handleSignUp;
window.handleSignUp = handleSignUp;
window.showToast = showToast;
window.setLoading = setLoading;