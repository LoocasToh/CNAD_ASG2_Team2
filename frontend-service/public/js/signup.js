// =========================
// SIGN UP PAGE - Care Companion (STANDALONE)
// Includes: toast, loading, validation, accessibility, show-password toggle
// =========================

const AUTH_BASE = window.AUTH_BASE_URL || 'http://localhost:8080/auth';

// local fallback data
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
  const user = JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser'));
  if (user) {
    showToast('You are already logged in. Redirecting...', 'info');
    setTimeout(() => (window.location.href = 'DailyTasks.html'), 1000);
  }
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

function validateUsername() {
  const usernameInput = document.getElementById('UsernameInput');
  if (!usernameInput) return;

  const username = usernameInput.value.trim();
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  if (!username) {
    usernameInput.classList.remove('valid', 'invalid');
    return;
  }

  if (usernameRegex.test(username)) {
    const isTaken = users.some(u => u.username === username);
    if (isTaken) {
      usernameInput.classList.add('invalid');
      usernameInput.classList.remove('valid');
      showToast('Username already taken', 'error');
    } else {
      usernameInput.classList.add('valid');
      usernameInput.classList.remove('invalid');
    }
  } else {
    usernameInput.classList.add('invalid');
    usernameInput.classList.remove('valid');
  }
}

function validateEmailField() {
  const emailInput = document.getElementById('EmailInput');
  if (!emailInput) return;

  const email = emailInput.value.trim();
  if (!email) {
    emailInput.classList.remove('valid', 'invalid');
    return;
  }

  if (validateEmail(email)) {
    const isRegistered = users.some(u => u.email === email);
    if (isRegistered) {
      emailInput.classList.add('invalid');
      emailInput.classList.remove('valid');
      showToast('Email already registered', 'error');
    } else {
      emailInput.classList.add('valid');
      emailInput.classList.remove('invalid');
    }
  } else {
    emailInput.classList.add('invalid');
    emailInput.classList.remove('valid');
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
// TASK SEEDING
// -------------------------
function createDefaultTasks(userId) {
  const now = Date.now();
  const defaultTasks = [
    {
      id: 'task-' + now + '-1',
      userId,
      title: 'Morning medication',
      description: 'Take prescribed morning medication',
      day: 'Mon',
      time: '08:00',
      category: 'medication',
      important: true,
      recurring: true,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-' + now + '-2',
      userId,
      title: 'Doctor appointment',
      description: 'Monthly check-up with Dr. Smith',
      day: 'Wed',
      time: '14:30',
      category: 'appointments',
      important: true,
      recurring: false,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-' + now + '-3',
      userId,
      title: 'Evening walk',
      description: '30-minute walk in the park',
      day: 'Fri',
      time: '18:00',
      category: 'health',
      important: false,
      recurring: true,
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];

  tasks.push(...defaultTasks);
  localStorage.setItem('careCompanionTasks', JSON.stringify(tasks));
}

// -------------------------
// SIGNUP
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
  const warningElement = document.getElementById('sWarning');

  if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !roleSelect || !termsAgreement || !signUpButton) return;

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const role = roleSelect.value || 'user';

  let isValid = true;

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    showToast('Username must be 3-20 characters (letters, numbers, underscores only)', 'error');
    usernameInput.focus();
    usernameInput.classList.add('invalid');
    isValid = false;
  }

  if (!validateEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    emailInput.focus();
    emailInput.classList.add('invalid');
    isValid = false;
  }

  if (!validatePassword(password)) {
    showToast('Password must be at least 8 characters with letters and numbers', 'error');
    passwordInput.focus();
    passwordInput.classList.add('invalid');
    isValid = false;
  }

  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    confirmPasswordInput.focus();
    confirmPasswordInput.classList.add('invalid');
    isValid = false;
  }

  if (!termsAgreement.checked) {
    showToast('Please agree to the Terms of Service and Privacy Policy', 'error');
    termsAgreement.focus();
    isValid = false;
  }

  if (!isValid) return;

  warningElement && (warningElement.style.display = 'none');
  signUpButton.style.marginTop = '40px';

  setLoading(signUpButton, true);

  try {
    const formData = {
      username,
      email,
      password,
      role,
      name: username,
      userType: role,
      newsletter: newsletter ? newsletter.checked : false,
    };

    const res = await fetch(`${AUTH_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (res.ok) {
      const newUser = {
        id: data.user?.id || 'user-' + Date.now(),
        username,
        email,
        password,
        role,
        name: username,
        createdAt: new Date().toISOString(),
        newsletter: newsletter ? newsletter.checked : false,
      };

      users.push(newUser);
      localStorage.setItem('careCompanionUsers', JSON.stringify(users));

      createDefaultTasks(newUser.id);

      if (data.token) {
        localStorage.setItem('careCompanionToken', data.token);
        localStorage.setItem('careCompanionUser', JSON.stringify(data.user || newUser));
      } else {
        localStorage.setItem('careCompanionUser', JSON.stringify({ ...newUser, password: undefined }));
      }

      showToast('Account created successfully! Welcome to Care Companion!', 'success');
      setTimeout(() => (window.location.href = 'DailyTasks.html'), 1500);
    } else {
      const errorMessage = data.error || data.message || 'Signup failed';
      showToast(errorMessage, 'error');

      if (warningElement) {
        warningElement.innerHTML = '* ' + errorMessage;
        warningElement.style.display = 'block';
        signUpButton.style.marginTop = '0px';
      }
    }
  } catch (error) {
    console.error('Signup error:', error);
    showToast('Network error. Using local signup.', 'info');

    // local fallback signup
    const newUser = {
      id: 'user-' + Date.now(),
      username,
      email,
      password,
      role,
      name: username,
      createdAt: new Date().toISOString(),
      newsletter: newsletter ? newsletter.checked : false,
    };

    users.push(newUser);
    localStorage.setItem('careCompanionUsers', JSON.stringify(users));
    createDefaultTasks(newUser.id);

    localStorage.setItem('careCompanionUser', JSON.stringify({ ...newUser, password: undefined }));

    showToast('Account created locally! Redirecting...', 'success');
    setTimeout(() => (window.location.href = 'DailyTasks.html'), 1500);
  } finally {
    setLoading(signUpButton, false);
  }
}

function initSignUpPage() {
  initAccessibility();

  const signupForm = document.getElementById('signupForm');
  signupForm?.addEventListener('submit', handleSignUp);

  document.getElementById('PasswordInput')?.addEventListener('input', updatePasswordStrength);
  document.getElementById('PasswordInput')?.addEventListener('input', validatePasswordMatch);
  document.getElementById('ConfirmPasswordInput')?.addEventListener('input', validatePasswordMatch);

  document.getElementById('UsernameInput')?.addEventListener('input', validateUsername);
  document.getElementById('EmailInput')?.addEventListener('input', validateEmailField);

  initRoleSelection();

  document.querySelectorAll('.social-btn')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.classList.contains('google-btn') ? 'google' : 'apple';
      showToast(`Signing up with ${provider}...`, 'info');
    });
  });

  document.querySelectorAll('.checkbox-label a')?.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showToast('Terms and Privacy pages coming soon!', 'info');
    });
  });

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
