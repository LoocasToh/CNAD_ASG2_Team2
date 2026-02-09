// =========================
// index.js (AUTH NAVBAR FIXED)
// Requires: auth-shared.js loaded BEFORE this file
// <script src="../js/auth.js"></script>
// <script src="../js/index.js"></script>
// =========================

document.addEventListener("DOMContentLoaded", () => {
  // Navbar elements (from your HTML)
  const headerUserName = document.getElementById("headerUserName");
  const loginLink = document.getElementById("login-link");
  const logoutLink = document.getElementById("logout-link");
  const profileLink = document.getElementById("profile-link");

  // safety checks
  if (!headerUserName || !loginLink || !logoutLink) return;

  // 1) Read auth state from auth-shared
  const token = window.auth?.getToken?.() || "";
  const user =
    window.auth?.getUser?.() ||
    safeJson(localStorage.getItem("careCompanionUser")) ||
    safeJson(sessionStorage.getItem("careCompanionUser"));

  // 2) Render UI
  if (token && user) {
    // Show name (prefer name -> email prefix)
    const displayName =
      user.name ||
      (user.email ? user.email.split("@")[0] : "User");

    headerUserName.textContent = displayName;

    loginLink.style.display = "none";
    logoutLink.style.display = "flex";

    // Optional: profile link goes to profile page
    if (profileLink) profileLink.style.display = "flex";
  } else {
    headerUserName.textContent = "Guest";

    loginLink.style.display = "flex";
    logoutLink.style.display = "none";

    if (profileLink) profileLink.style.display = "flex"; // you can hide if you want
  }

  // 3) Logout click -> use shared logout
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof window.handleLogout === "function") {
      window.handleLogout(e);
    } else {
      // fallback
      localStorage.removeItem("careCompanionToken");
      sessionStorage.removeItem("careCompanionToken");
      localStorage.removeItem("careCompanionUser");
      sessionStorage.removeItem("careCompanionUser");
      window.location.href = "LoginScreen.html";
    }
  });
});

// helper
function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
