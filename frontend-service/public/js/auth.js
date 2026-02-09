// =========================
// auth-shared.js (FIXED + CONSISTENT)
// =========================

// Your backend mounts like:
// app.use("/auth", authRoutes);
// app.use("/auth", profileRoutes);
// So profile endpoints are: /auth/me/profile, /auth/me/contacts, etc.
window.AUTH_BASE_URL = window.AUTH_BASE_URL || "http://localhost:8080/auth";

const AUTH_BASE = window.AUTH_BASE_URL;

// Use ONE token key everywhere
const TOKEN_KEY   = "careCompanionToken";
const USER_KEY    = "careCompanionUser";      // MUST stay as {id,name,email,userType}
const PROFILE_KEY = "careCompanionProfile";   // separate storage for profile row

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getUser() {
  return (
    safeJson(localStorage.getItem(USER_KEY)) ||
    safeJson(sessionStorage.getItem(USER_KEY)) ||
    null
  );
}

// Use this after login to store the AUTH user object
function setUser(user, remember = true) {
  if (!user) return;

  // sanity: make sure id is numeric
  const numericId = Number(user.id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    console.warn("setUser: user.id is not numeric:", user.id);
  }

  const userObj = { ...user, id: numericId };

  if (remember) {
    localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    sessionStorage.removeItem(USER_KEY);
  } else {
    sessionStorage.setItem(USER_KEY, JSON.stringify(userObj));
    localStorage.removeItem(USER_KEY);
  }
}

function clearAuth() {
  // Clear token + user + profile
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);

  localStorage.removeItem(PROFILE_KEY);
  sessionStorage.removeItem(PROFILE_KEY);

  // optional old keys cleanup
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("careCompanionRemember");
}

// -------------------------
// Fetch profile row (NOT auth user)
// -------------------------
async function loadMyProfile() {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${AUTH_BASE}/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // token invalid -> logout
    clearAuth();
    return null;
  }

  const profile = await res.json();

  // IMPORTANT: store profile separately
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // Optional: broadcast
  document.dispatchEvent(
    new CustomEvent("profileStored", { detail: profile })
  );

  return profile;
}

// -------------------------
// Guard pages (simple)
// -------------------------
async function protectPages(pages) {
  const currentPage = window.location.pathname.split("/").pop();

  if (!pages.includes(currentPage)) return;

  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = "LoginScreen.html";
    return;
  }

  // optionally verify token by calling profile
  const ok = await loadMyProfile();
  if (!ok) window.location.href = "LoginScreen.html";
}

// -------------------------
// Logout
// -------------------------
function handleLogout(e) {
  if (e) e.preventDefault();
  clearAuth();
  if (typeof showToast === "function") showToast("Logged out", "info");
  setTimeout(() => (window.location.href = "LoginScreen.html"), 200);
}

// expose globally
window.handleLogout = handleLogout;

window.auth = {
  AUTH_BASE,
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,
  loadMyProfile,
  protectPages,
};
