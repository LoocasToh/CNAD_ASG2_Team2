(() => {
  // =========================
  // Profile (API-backed) - MyBuddy
  // =========================

  // IMPORTANT:
  // - Wrap in IIFE to avoid "already declared" conflicts with auth.js
  // - Use /me/... endpoints (based on your router file)

const API_BASE = window.AUTH_BASE_URL || "http://localhost:8080/auth";


  // -------------------------
  // DOM Elements
  // -------------------------
  const editPersonalBtn = document.getElementById("edit-personal-btn");
  const addContactBtn = document.getElementById("add-contact-btn");
  const editHealthBtn = document.getElementById("edit-health-btn");

  const editPersonalModal = document.getElementById("edit-personal-modal");
  const addContactModal = document.getElementById("add-contact-modal");

  // (Optional) if you haven't added health modal in HTML, this stays null safely
  const editHealthModal = document.getElementById("edit-health-modal");

  const closeEditModal = document.getElementById("close-edit-modal");
  const closeContactModal = document.getElementById("close-contact-modal");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const cancelContactBtn = document.getElementById("cancel-contact-btn");

  const personalForm = document.getElementById("personal-form");
  const contactForm = document.getElementById("contact-form");
  const healthForm = document.getElementById("health-form"); // only if you add it

  const toast = document.getElementById("toast");

  // Header auth section
  const userSection = document.getElementById("auth-area");
  const userDropdown = userSection?.querySelector(".user-dropdown");
  const loginLink = document.getElementById("login-link");
  const logoutLink = document.getElementById("logout-link");
  const headerUserName = document.getElementById("headerUserName");

  // Profile data elements
  const displayName = document.getElementById("display-name");
  const fullName = document.getElementById("full-name");
  const dobEl = document.getElementById("dob");
  const genderEl = document.getElementById("gender");
  const phoneEl = document.getElementById("phone");
  const emailEl = document.getElementById("email");
  const addressEl = document.getElementById("address");
  const userRole = document.getElementById("user-role");
  const userAvatar = document.getElementById("user-avatar");

  // Progress tracking
  const profileCompletion = document.getElementById("profile-completion");
  const lastUpdated = document.getElementById("last-updated");
  const memberSince = document.getElementById("member-since");

  // Contacts container
  const contactsContainer = document.getElementById("contacts-container");

  // Add/Edit Contact modal fields (re-using add modal for edit)
  const contactNameInput = document.getElementById("contact-name");
  const contactRelInput = document.getElementById("contact-relationship");
  const contactPhoneInput = document.getElementById("contact-phone");
  const contactNotesInput = document.getElementById("contact-notes");
  const contactPrimaryInput = document.getElementById("is-primary-contact");
  const contactModalTitle = addContactModal?.querySelector(".modal-header h3");

  // -------------------------
  // State
  // -------------------------
  let me = null;        // /me (optional)
  let profile = null;   // /me/profile
  let contacts = [];    // /me/contacts
  let health = null;    // /me/health

  let contactEditMode = false;
  let editingContactId = null;

  // -------------------------
  // Auth helpers
  // -------------------------
  function getToken() {
    return localStorage.getItem("careCompanionToken") || "";
  }

  function getCurrentUser() {
    return (
      JSON.parse(localStorage.getItem("careCompanionUser")) ||
      JSON.parse(sessionStorage.getItem("careCompanionUser")) ||
      null
    );
  }

  function logoutUser() {
    if (!confirm("Are you sure you want to logout?")) return;

    localStorage.removeItem("careCompanionToken");
    localStorage.removeItem("careCompanionUser");
    localStorage.removeItem("careCompanionRemember");
    sessionStorage.removeItem("careCompanionUser");

    showToast("Logged out successfully", "success");
    setTimeout(() => (window.location.href = "LoginScreen.html"), 500);
  }

  async function apiAuth(path, options = {}) {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${API_BASE}${path}`;
    // console.log("API =>", url);

    const res = await fetch(url, { ...options, headers });
    const text = await res.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed (${res.status}) on ${path}`);
    }
    return data;
  }

  // -------------------------
  // Init
  // -------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      wireUI();

      const token = getToken();
      const user = getCurrentUser();

      if (!token || !user) {
        headerUserName.textContent = "Guest";
        loginLink.style.display = "flex";
        logoutLink.style.display = "none";
        showToast("Please login to view your profile.", "warning");
        setTimeout(() => (window.location.href = "LoginScreen.html"), 800);
        return;
      }

      loginLink.style.display = "none";
      logoutLink.style.display = "flex";

      await loadAll();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load profile", "error");
    }
  });

  async function loadAll() {
    // NOTE: your router file does NOT show /me endpoint for basic user.
    // So we take user info from localStorage, and rely on /me/profile + /me/contacts + /me/health.
    // If you DO have a /me endpoint elsewhere, you can add it back.

    profile = await apiAuth("/me/profile", { method: "GET" }).catch(() => null);

    const contactsData = await apiAuth("/me/contacts", { method: "GET" }).catch(() => ({ contacts: [] }));
    contacts = contactsData?.contacts || [];

    health = await apiAuth("/me/health", { method: "GET" }).catch(() => null);

    // fallback "me" from storage
    me = getCurrentUser();

    renderAuthUser(me);
    renderProfile(profile, me);
    renderContacts(contacts);

    updateProfileCompletion();
    updateLastUpdated();
  }

  // -------------------------
  // Render
  // -------------------------
  function renderAuthUser(meObj) {
  const preferredFullName =
    (profile?.full_name && String(profile.full_name).trim()) ||
    (meObj?.name && String(meObj.name).trim()) ||
    (meObj?.email && String(meObj.email).trim()) ||
    "User";

  // ✅ show FULL name in navbar
  headerUserName.textContent = preferredFullName;

  userRole.textContent = meObj?.userType === "caregiver" ? "Caregiver" : "Care Recipient";
  emailEl.textContent = meObj?.email || "-";

  displayName.textContent = preferredFullName;
  fullName.textContent = preferredFullName;
}



  function renderProfile(profileObj, meObj) {
    const full = profileObj?.full_name || meObj?.name || "-";
    fullName.textContent = full;
    displayName.textContent = full;

    if (profileObj?.dob) {
      const d = new Date(profileObj.dob);
      dobEl.textContent = Number.isNaN(d.getTime())
        ? "-"
        : d.toLocaleDateString("en-SG", { day: "2-digit", month: "long", year: "numeric" });
    } else {
      dobEl.textContent = "-";
    }

    genderEl.textContent = profileObj?.gender ? cap(profileObj.gender) : "-";
    phoneEl.textContent = profileObj?.phone || "-";
    addressEl.textContent = profileObj?.address || "-";

    if (userAvatar) userAvatar.style.background = "#5a6cff";
  }

  function renderContacts(list) {
    if (!contactsContainer) return;

    const loading = document.getElementById("contacts-loading");
    if (loading) loading.remove();

    if (!list || !list.length) {
      contactsContainer.innerHTML = `<p style="color:#718096; padding:12px;">No emergency contacts yet.</p>`;
      return;
    }

    contactsContainer.innerHTML = list.map(contactCardHTML).join("");
  }

  function contactCardHTML(c) {
    const isPrimary = Number(c.isPrimary) === 1 || c.isPrimary === true;
    const rel = (c.relationship || "contact").toLowerCase();

    const typeIcon =
      rel === "doctor" ? "fa-user-md" :
      rel === "caregiver" ? "fa-hands-helping" :
      "fa-user-friends";

    return `
      <div class="contact-card ${isPrimary ? "primary-contact" : ""}">
        ${isPrimary ? `<div class="contact-badge"><i class="fas fa-star"></i> Primary</div>` : ""}
        <div class="contact-header">
          <div class="contact-avatar"><i class="fas ${typeIcon}"></i></div>
          <div class="contact-info">
            <h3>${escapeHTML(c.name)}</h3>
            <p class="contact-relationship">${escapeHTML(c.relationship || "Contact")}</p>
          </div>
        </div>
        <div class="contact-details">
          <p><i class="fas fa-phone"></i> <strong>Phone:</strong> ${escapeHTML(c.phone || "-")}</p>
          ${c.notes ? `<p><i class="fas fa-sticky-note"></i> <strong>Notes:</strong> ${escapeHTML(c.notes)}</p>` : ""}
        </div>
        <div class="contact-actions">
          <button class="btn-contact-action call-btn" data-action="call" data-id="${c.id}">
            <i class="fas fa-phone"></i> Call
          </button>
          <button class="btn-contact-action edit-btn" data-action="edit" data-id="${c.id}">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-contact-action edit-btn" data-action="delete" data-id="${c.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }

  // -------------------------
  // Contacts: Add/Edit modal (reuse add modal)
  // -------------------------
  function openAddContactModal() {
    contactEditMode = false;
    editingContactId = null;

    contactForm?.reset();
    if (contactPrimaryInput) contactPrimaryInput.checked = false;

    if (contactModalTitle) contactModalTitle.innerHTML = `<i class="fas fa-user-plus"></i> Add Emergency Contact`;

    addContactModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function openEditContactModalReuseAdd(c) {
    contactEditMode = true;
    editingContactId = c.id;

    if (contactModalTitle) contactModalTitle.innerHTML = `<i class="fas fa-user-edit"></i> Edit Emergency Contact`;

    contactNameInput.value = c.name || "";
    contactRelInput.value = c.relationship || "family";
    contactPhoneInput.value = c.phone || "";
    contactNotesInput.value = c.notes || "";
    contactPrimaryInput.checked = Number(c.isPrimary) === 1 || c.isPrimary === true;

    addContactModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeAddContactModal() {
    addContactModal.style.display = "none";
    document.body.style.overflow = "auto";
    contactEditMode = false;
    editingContactId = null;
  }

  async function refreshContacts() {
    const contactsData = await apiAuth("/me/contacts", { method: "GET" });
    contacts = contactsData?.contacts || [];
    renderContacts(contacts);
  }

  // -------------------------
  // Personal edit modal
  // -------------------------
  function openEditPersonalModal() {
    const nameStr = (profile?.full_name || me?.name || "").trim();
    const parts = nameStr ? nameStr.split(" ") : [];

    document.getElementById("edit-first-name").value = parts[0] || "";
    document.getElementById("edit-last-name").value = parts.slice(1).join(" ") || "";

    document.getElementById("edit-dob").value = profile?.dob ? String(profile.dob).slice(0, 10) : "";
    document.getElementById("edit-gender").value = profile?.gender || "";
    document.getElementById("edit-phone").value = profile?.phone || "";
    document.getElementById("edit-email").value = me?.email || "";
    document.getElementById("edit-address").value = profile?.address || "";

    editPersonalModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeEditPersonalModal() {
    editPersonalModal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  // -------------------------
  // Form handlers
  // -------------------------
  personalForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const first = document.getElementById("edit-first-name").value.trim();
      const last = document.getElementById("edit-last-name").value.trim();
      const full_name = `${first} ${last}`.trim();

      const payload = {
        full_name,
        dob: document.getElementById("edit-dob").value || null,
        gender: document.getElementById("edit-gender").value || null,
        phone: document.getElementById("edit-phone").value.trim() || null,
        address: document.getElementById("edit-address").value.trim() || null,
      };

      profile = await apiAuth("/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // update stored user name too (optional UI consistency)
      const stored = getCurrentUser();
      if (stored) {
        stored.name = full_name;
        localStorage.setItem("careCompanionUser", JSON.stringify(stored));
      }
      me = getCurrentUser();

      renderAuthUser(me);
      renderProfile(profile, me);

      closeEditPersonalModal();
      showToast("Profile updated!", "success");
      updateProfileCompletion();
      updateLastUpdated();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to update profile", "error");
    }
  });

  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: contactNameInput.value.trim(),
        relationship: contactRelInput.value,
        phone: contactPhoneInput.value.trim(),
        notes: contactNotesInput.value.trim() || null,
        is_primary: contactPrimaryInput.checked ? 1 : 0,
      };


      if (!payload.name || !payload.phone) {
        showToast("Please fill in contact name and phone.", "warning");
        return;
      }

      if (contactEditMode && editingContactId) {
        await apiAuth(`/me/contacts/${editingContactId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("Contact updated!", "success");
      } else {
        await apiAuth("/me/contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Contact added!", "success");
      }

      await refreshContacts();
      closeAddContactModal();
      contactForm.reset();

      updateProfileCompletion();
      updateLastUpdated();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save contact", "error");
    }
  });

  // -------------------------
  // UI wiring
  // -------------------------
  function wireUI() {
    // Buttons (your "Add Contact" not clickable was usually because JS crashed earlier)
    addContactBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openAddContactModal();
    });

    editPersonalBtn?.addEventListener("click", openEditPersonalModal);

    closeEditModal?.addEventListener("click", closeEditPersonalModal);
    cancelEditBtn?.addEventListener("click", closeEditPersonalModal);

    closeContactModal?.addEventListener("click", closeAddContactModal);
    cancelContactBtn?.addEventListener("click", closeAddContactModal);

    // Click outside closes modals
    document.addEventListener("click", (e) => {
      if (e.target === editPersonalModal) closeEditPersonalModal();
      if (e.target === addContactModal) closeAddContactModal();
      if (editHealthModal && e.target === editHealthModal) closeModal(editHealthModal);
    });

    // IMPORTANT: event delegation for dynamically rendered contacts
    contactsContainer?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const c = contacts.find((x) => String(x.id) === String(id));
      if (!c) return;

      if (action === "call") {
        showToast(`Calling ${c.name}...`, "info");
        return;
      }

      if (action === "edit") {
        openEditContactModalReuseAdd(c);
        return;
      }

      if (action === "delete") {
        if (!confirm(`Delete ${c.name}?`)) return;
        await apiAuth(`/me/contacts/${c.id}`, { method: "DELETE" });
        await refreshContacts();
        showToast("Contact deleted", "success");
        updateProfileCompletion();
        updateLastUpdated();
      }
    });

    // Dropdown hover
    userSection?.addEventListener("mouseenter", () => {
      if (userDropdown) userDropdown.style.display = "block";
    });
    userSection?.addEventListener("mouseleave", () => {
      setTimeout(() => {
        if (userDropdown && !userDropdown.matches(":hover")) userDropdown.style.display = "none";
      }, 200);
    });
    userDropdown?.addEventListener("mouseleave", () => {
      if (userDropdown) userDropdown.style.display = "none";
    });

    logoutLink?.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });

    // Smooth scroll
    document.querySelectorAll(".sidebar-menu a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
          document.querySelectorAll(".sidebar-menu li").forEach((item) => item.classList.remove("active"));
          link.parentElement.classList.add("active");
        }
      });
    });

    // Avatar
    document.getElementById("change-avatar-btn")?.addEventListener("click", () => {
      if (!userAvatar) return;
      userAvatar.style.background = randomAvatarColor();
      showToast("Avatar updated!", "success");
    });
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = "none";
    document.body.style.overflow = "auto";
  }

  function randomAvatarColor() {
    const colors = ["#5a6cff", "#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // -------------------------
  // Helpers
  // -------------------------
  function cap(s) {
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function updateProfileCompletion() {
    const checks = [
      (profile?.full_name || me?.name) ? 1 : 0,
      profile?.dob ? 1 : 0,
      profile?.phone ? 1 : 0,
      me?.email ? 1 : 0,
      profile?.address ? 1 : 0,
      (contacts?.length || 0) > 0 ? 1 : 0,
    ];
    const pct = Math.round((checks.reduce((a, b) => a + b, 0) / checks.length) * 100);
    if (profileCompletion) profileCompletion.textContent = `${pct}%`;
  }

  function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
    const dateString = now.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
    if (lastUpdated) lastUpdated.textContent = `${dateString} ${timeString}`;
  }

  // -------------------------
  // Toast
  // -------------------------
  function showToast(message, type = "info") {
    if (!toast) return;
    const toastMessage = toast.querySelector(".toast-message");
    const toastIcon = toast.querySelector(".toast-icon");

    toastMessage.textContent = message;

    switch (type) {
      case "success":
        toastIcon.className = "fas fa-check-circle toast-icon";
        toastIcon.style.color = "#10b981";
        break;
      case "warning":
        toastIcon.className = "fas fa-exclamation-triangle toast-icon";
        toastIcon.style.color = "#f59e0b";
        break;
      case "error":
        toastIcon.className = "fas fa-times-circle toast-icon";
        toastIcon.style.color = "#ef4444";
        break;
      default:
        toastIcon.className = "fas fa-info-circle toast-icon";
        toastIcon.style.color = "#3b82f6";
        break;
    }

    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), type === "error" ? 5000 : 3000);
  }
})();
