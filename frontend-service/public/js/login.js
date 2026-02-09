// =========================
// login.js - Care Companion (Backend Auth)
// Works with backend response:
// { token, user: { id, name, email, userType } }
// =========================

// IMPORTANT:
// Do NOT redeclare AUTH_BASE if auth.js already loaded.
// We read from a global if present, else fallback.
const AUTH_BASE =
  (window.auth && window.auth.AUTH_BASE) ||
  window.AUTH_BASE_URL ||
  "http://localhost:8080/auth";

// =========================
// UTILITY FUNCTIONS
// =========================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  const toastIcon = toast.querySelector(".toast-icon");
  const toastMessage = toast.querySelector(".toast-message");

  if (toastIcon) {
    if (type === "success") {
      toastIcon.className = "fas fa-check-circle toast-icon";
      toastIcon.style.color = "#8affc1";
    } else if (type === "error") {
      toastIcon.className = "fas fa-exclamation-circle toast-icon";
      toastIcon.style.color = "#ff6b6b";
    } else {
      toastIcon.className = "fas fa-info-circle toast-icon";
      toastIcon.style.color = "#a8c0ff";
    }
  }

  if (toastMessage) toastMessage.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
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

  if (strength <= 2) return "weak";
  if (strength <= 4) return "medium";
  return "strong";
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function clearOldBadSessions() {
  const u1 = localStorage.getItem("careCompanionUser");
  const u2 = sessionStorage.getItem("careCompanionUser");
  const parsed1 = u1 ? safeJson(u1) : null;
  const parsed2 = u2 ? safeJson(u2) : null;

  const bad =
    (parsed1 && !Number.isFinite(Number(parsed1.id))) ||
    (parsed2 && !Number.isFinite(Number(parsed2.id)));

  if (bad) {
    localStorage.removeItem("careCompanionUser");
    sessionStorage.removeItem("careCompanionUser");
    localStorage.removeItem("careCompanionToken");
    localStorage.removeItem("careCompanionRemember");
  }
}

// =========================
// ACCESSIBILITY
// =========================
function initAccessibility() {
  document.getElementById("text-size-btn")?.addEventListener("click", () => {
    document.body.classList.toggle("large-text");
    showToast(
      document.body.classList.contains("large-text")
        ? "Large text enabled"
        : "Normal text size",
      "info"
    );
  });

  document.getElementById("high-contrast-btn")?.addEventListener("click", () => {
    document.body.classList.toggle("high-contrast");
    showToast(
      document.body.classList.contains("high-contrast")
        ? "High contrast enabled"
        : "High contrast disabled",
      "info"
    );
  });

  // show password toggle
  document.querySelectorAll(".show-password")?.forEach((btn) => {
    btn.addEventListener("click", function () {
      const input = document.getElementById("PasswordInput");
      const icon = this.querySelector("i");
      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        if (icon) icon.className = "fas fa-eye-slash";
        this.setAttribute("aria-label", "Hide password");
      } else {
        input.type = "password";
        if (icon) icon.className = "fas fa-eye";
        this.setAttribute("aria-label", "Show password");
      }
    });
  });
}

// =========================
// API
// =========================
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

// =========================
// LOGIN FLOW
// =========================
function initLoginPage() {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  const passwordInput = document.getElementById("PasswordInput");
  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      const strength = checkPasswordStrength(this.value);
      const strengthBar = document.querySelector(".strength-bar");
      const strengthText = document.querySelector(".strength-text");

      if (strengthBar && strengthText) {
        strengthBar.className = "strength-bar " + strength;
        strengthText.textContent =
          strength.charAt(0).toUpperCase() + strength.slice(1) + " password";
      }
    });
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleLogin();
  });
}

async function handleLogin() {
  const usernameInput = document.getElementById("UsernameInput");
  const passwordInput = document.getElementById("PasswordInput");
  const rememberMe = document.getElementById("remember-me");
  const loginButton = document.getElementById("LoginButton");

  const email = (usernameInput?.value || "").trim();
  const password = passwordInput?.value || "";

  if (!email || !password) {
    showToast("Enter email and password", "error");
    return;
  }

  setLoading(loginButton, true);

  try {
    // backend expects { email, password }
    const data = await postJson(`${AUTH_BASE}/login`, { email, password });

    // backend returns { token, user: { id, name, email, userType } }
    const token = data?.token;
    const user = data?.user;

    if (!token || !user) {
      showToast("Login response missing token/user", "error");
      return;
    }

    const userObj = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      userType: user.userType,
    };

    if (!Number.isFinite(userObj.id) || userObj.id <= 0) {
      showToast("Backend returned invalid user.id (must be numeric).", "error");
      return;
    }

    // Store token (always localStorage)
    localStorage.setItem("careCompanionToken", token);

    // Store user depending on Remember Me
    if (rememberMe?.checked) {
      localStorage.setItem("careCompanionUser", JSON.stringify(userObj));
      localStorage.setItem("careCompanionRemember", "true");
      sessionStorage.removeItem("careCompanionUser");
    } else {
      sessionStorage.setItem("careCompanionUser", JSON.stringify(userObj));
      localStorage.removeItem("careCompanionUser");
      localStorage.removeItem("careCompanionRemember");
    }

    showToast("Login success!", "success");

    // Use RELATIVE redirect (works in /HTML folder)
    const redirect = userObj.userType === "caregiver"
      ? "caregiver.html"
      : "DailyTasks.html";

    setTimeout(() => {
      window.location.href = redirect;
    }, 600);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Login failed", "error");
  } finally {
    setLoading(loginButton, false);
  }
}

// =========================
// INITIALIZATION
// =========================
document.addEventListener("DOMContentLoaded", function () {
  console.log("Login Page Initialized");
  clearOldBadSessions();
  initAccessibility();
  initLoginPage();

  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.3s ease";
  setTimeout(() => (document.body.style.opacity = "1"), 50);
});

window.addEventListener("error", function (e) {
  console.error("Login page error:", e.error);
  showToast("An error occurred. Please try again.", "error");
});
