// =========================
// DailyTasks Dynamic (MySQL-backed)
// - Task CRUD (task-service 8081)
// - Completion logs (task_logs)
// - Progress bar updates
// - Filters + History view
// - ROLE PROTECTION: ONLY user accounts can stay here
// =========================

const API_BASE = window.API_BASE_URL || "http://localhost:8081"; // task-service
const LOGIN_PAGE = "LoginScreen.html";
const INDEX_PAGE = "Index.html";
const CAREGIVER_PAGE = "caregiver.html";

// -------------------------
// AUTH HELPERS (unified)
// -------------------------
function getToken() {
  return (
    (window.auth && window.auth.getToken && window.auth.getToken()) ||
    localStorage.getItem("careCompanionToken") ||
    ""
  );
}

function getCurrentUser() {
  // sessionStorage first (remember-me unchecked), then localStorage
  const viaAuth = window.auth && window.auth.getUser && window.auth.getUser();
  if (viaAuth) return viaAuth;

  try {
    const s = sessionStorage.getItem("careCompanionUser");
    if (s) return JSON.parse(s);
  } catch {}

  try {
    const l = localStorage.getItem("careCompanionUser");
    if (l) return JSON.parse(l);
  } catch {}

  return null;
}

function requireUserOrRedirect() {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = LOGIN_PAGE;
    return false;
  }

  const role = String(user.userType || "").toLowerCase();
  if (role !== "user") {
    // logged in but wrong role -> send to caregiver page
    window.location.href = CAREGIVER_PAGE;
    return false;
  }

  return true;
}

function getUserIdStrict(user) {
  const id = user?.id ?? user?.userId ?? user?._id;
  const n = Number(id);
  if (Number.isFinite(n) && n > 0) return n;

  const stored = localStorage.getItem("careCompanionUserId");
  const ns = Number(stored);
  if (Number.isFinite(ns) && ns > 0) return ns;

  throw new Error(
    `UserId is not numeric (${id}). Your tasks.userId is INT, so either:
- change DB userId to VARCHAR, or
- ensure auth returns numeric userId.`
  );
}

function handleLogout(e) {
  if (e) e.preventDefault();

  if (window.auth && window.auth.clearAuth) {
    window.auth.clearAuth();
  }

  localStorage.removeItem("careCompanionToken");
  localStorage.removeItem("careCompanionUser");
  localStorage.removeItem("careCompanionRemember");
  sessionStorage.removeItem("careCompanionUser");

  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");

  window.location.href = INDEX_PAGE;
}

function renderHeaderAuthUI() {
  const headerUserName = document.getElementById("headerUserName");
  const loginLink = document.getElementById("login-link");
  const logoutLink = document.getElementById("logout-link");

  const token = getToken();
  const user = getCurrentUser();

  if (token && user) {
    let label = user?.name || user?.username || user?.email || "User";
    if (typeof label === "string" && label.includes("@")) label = label.split("@")[0];
    if (headerUserName) headerUserName.textContent = label;

    if (loginLink) loginLink.style.display = "none";
    if (logoutLink) logoutLink.style.display = "flex";
  } else {
    if (headerUserName) headerUserName.textContent = "Guest";
    if (loginLink) loginLink.style.display = "flex";
    if (logoutLink) logoutLink.style.display = "none";
  }

  logoutLink?.addEventListener("click", handleLogout);
}

// -------------------------
// API
// -------------------------
async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// -------------------------
// UI refs
// -------------------------
const els = {
  container: document.getElementById("task-cards-container"),
  empty: document.getElementById("empty-state"),

  progressFill: document.getElementById("progress-fill"),
  progressPct: document.getElementById("progress-percentage"),
  progressText: document.getElementById("progress-text"),

  addBtn: document.getElementById("add-task-btn"),
  addEmptyBtn: document.getElementById("add-task-empty-btn"),
  clearCompletedBtn: document.getElementById("clear-completed-btn"),

  modalOverlay: document.getElementById("task-modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  cancelModalBtn: document.getElementById("cancel-task-btn"),
  taskForm: document.getElementById("task-form"),

  inputTitle: document.getElementById("task-title"),
  inputDesc: document.getElementById("task-description"),
  inputCat: document.getElementById("task-category"),
  inputTime: document.getElementById("task-time"),
  inputDuration: document.getElementById("task-duration"),
  inputImportant: document.getElementById("task-important"),
  inputRecurring: document.getElementById("task-recurring"),
  inputDate: document.getElementById("task-date"),
  inputEndDate: document.getElementById("task-end-date"),

  categoryButtons: document.querySelectorAll(".category-btn"),

  allLink: document.getElementById("all-tasks-link"),
  todayLink: document.getElementById("today-tasks-link"),
  importantLink: document.getElementById("important-tasks-link"),
  completedLink: document.getElementById("completed-tasks-link"),
  pendingLink: document.getElementById("pending-tasks-link"),
  historyLink: document.getElementById("history-link"),

  sidebarItems: document.querySelectorAll(".sidebar-menu li"),
  filterTitle: document.getElementById("current-filter-title"),
};

let user = null;
let userId = null;
let tasks = [];
let completedTodaySet = new Set();

let currentFilter = "all"; // all | today | important | completed | pending | history
let filteredTasks = [];
let editMode = false;
let editingTaskId = null;

// -------------------------
// Helpers
// -------------------------
function setActiveSidebar(linkId) {
  els.sidebarItems?.forEach((li) => li.classList.remove("active"));
  const link = document.getElementById(linkId);
  const li = link?.closest("li");
  li?.classList.add("active");
}

function localYMD(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysYMD(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localYMD(dt);
}

function isOnOrBefore(aYMD, bYMD) {
  return aYMD <= bYMD;
}

function normalizeCategory(c) {
  const v = (c || "other").toLowerCase();
  if (["medication", "hygiene", "meal", "appointment", "other"].includes(v)) return v;
  return "other";
}

function categoryIcon(cat) {
  if (cat === "medication") return `<i class="fas fa-pills"></i>`;
  if (cat === "hygiene") return `<i class="fas fa-hands-wash"></i>`;
  if (cat === "meal") return `<i class="fas fa-utensils"></i>`;
  if (cat === "appointment") return `<i class="fas fa-calendar-check"></i>`;
  return `<i class="fas fa-ellipsis-h"></i>`;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function formatTime(mysqlTime) {
  const parts = String(mysqlTime).split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] || "0");
  if (!Number.isFinite(h) || !Number.isFinite(m)) return mysqlTime;

  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(mysqlDate) {
  if (!mysqlDate) return "";

  if (typeof mysqlDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mysqlDate)) {
    const [y, m, d] = mysqlDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
  }

  const dt = new Date(mysqlDate);
  if (Number.isNaN(dt.getTime())) return String(mysqlDate);

  return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function renderTodayDate() {
  const el = document.getElementById("current-date-display");
  if (!el) return;

  const now = new Date();
  el.textContent = now.toLocaleDateString("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// -------------------------
// Filters
// -------------------------
function applyFilter() {
  const list = Array.isArray(tasks) ? tasks : [];
  const todayLocal = localYMD(new Date());

  if (currentFilter === "today") {
    filteredTasks = list.filter((t) => {
      if (!t.task_date) return false;
      const taskLocal = localYMD(t.task_date);
      return taskLocal === todayLocal;
    });
    els.filterTitle && (els.filterTitle.textContent = "Today's Tasks");
    setActiveSidebar("today-tasks-link");
  } else if (currentFilter === "important") {
    filteredTasks = list.filter((t) => Number(t.important) === 1 || t.important === true);
    els.filterTitle && (els.filterTitle.textContent = "Important");
    setActiveSidebar("important-tasks-link");
  } else if (currentFilter === "completed") {
    filteredTasks = list.filter((t) => completedTodaySet.has(Number(t.id)));
    els.filterTitle && (els.filterTitle.textContent = "Completed");
    setActiveSidebar("completed-tasks-link");
  } else if (currentFilter === "pending") {
    filteredTasks = list.filter((t) => !completedTodaySet.has(Number(t.id)));
    els.filterTitle && (els.filterTitle.textContent = "Pending");
    setActiveSidebar("pending-tasks-link");
  } else {
    filteredTasks = list;
    els.filterTitle && (els.filterTitle.textContent = "All Tasks");
    setActiveSidebar("all-tasks-link");
  }

  renderTasksOnly();
  updateProgress();
}

// -------------------------
// Daily auto-create next-day copy
// -------------------------
async function ensureNextDailyTask(task) {
  const isDaily = Number(task.isDaily) === 1;
  if (!isDaily) return;

  const base = task.task_date ? localYMD(task.task_date) : localYMD(new Date());
  if (!base) return;

  const nextDate = addDaysYMD(base, 1);

  if (task.end_date) {
    const end = localYMD(task.end_date);
    if (end && !isOnOrBefore(nextDate, end)) return;
  }

  const exists = tasks.some(
    (t) =>
      Number(t.isDaily) === 1 &&
      (t.title || "").trim().toLowerCase() === (task.title || "").trim().toLowerCase() &&
      localYMD(t.task_date) === nextDate
  );
  if (exists) return;

  const payload = {
    userId,
    title: task.title,
    description: task.description || null,
    category: task.category || "other",
    task_time: task.task_time ? String(task.task_time).slice(0, 5) : null,
    isDaily: 1,
    important: Number(task.important) === 1 ? 1 : 0,
    task_date: nextDate,
    end_date: task.end_date ? String(task.end_date).slice(0, 10) : null,
    duration: task.duration ?? null,
  };

  await api("/tasks", { method: "POST", body: JSON.stringify(payload) });
}

// -------------------------
// Modal logic
// -------------------------
function showModal() {
  if (!els.modalOverlay) return;
  els.modalOverlay.style.display = "flex";
  setTimeout(() => els.inputTitle?.focus(), 50);
}

function closeModal() {
  if (!els.modalOverlay) return;
  els.modalOverlay.style.display = "none";
  editMode = false;
  editingTaskId = null;
}

function resetModal() {
  if (els.inputTitle) els.inputTitle.value = "";
  if (els.inputDesc) els.inputDesc.value = "";
  if (els.inputTime) els.inputTime.value = "";
  if (els.inputDuration) els.inputDuration.value = "";
  if (els.inputImportant) els.inputImportant.checked = false;
  if (els.inputRecurring) els.inputRecurring.checked = false;
  if (els.inputDate) els.inputDate.value = localYMD(new Date()) || "";
  if (els.inputEndDate) els.inputEndDate.value = "";

  if (els.inputCat) els.inputCat.value = "medication";
  els.categoryButtons.forEach((b) => b.classList.remove("active"));
  const medBtn = Array.from(els.categoryButtons).find((b) => b.dataset.category === "medication");
  medBtn?.classList.add("active");
}

function openCreateModal() {
  editMode = false;
  editingTaskId = null;
  if (els.modalTitle) els.modalTitle.textContent = "Add New Task";
  resetModal();
  showModal();
}

function openEditModal(task) {
  editMode = true;
  editingTaskId = task.id;

  if (els.modalTitle) els.modalTitle.textContent = "Edit Task";

  if (els.inputTitle) els.inputTitle.value = task.title || "";
  if (els.inputDesc) els.inputDesc.value = task.description || "";
  if (els.inputTime) els.inputTime.value = task.task_time ? String(task.task_time).slice(0, 5) : "";
  if (els.inputDuration) els.inputDuration.value = task.duration ?? "";

  if (els.inputImportant) els.inputImportant.checked = Number(task.important) === 1 || task.important === true;
  if (els.inputRecurring) els.inputRecurring.checked = Number(task.isDaily) === 1 || task.isDaily === true;

  if (els.inputDate) els.inputDate.value = task.task_date ? String(task.task_date).slice(0, 10) : "";
  if (els.inputEndDate) els.inputEndDate.value = task.end_date ? String(task.end_date).slice(0, 10) : "";

  const cat = normalizeCategory(task.category);
  if (els.inputCat) els.inputCat.value = cat;
  els.categoryButtons.forEach((b) => b.classList.remove("active"));
  const btn = Array.from(els.categoryButtons).find(
    (b) => (b.dataset.category || "").toLowerCase() === cat
  );
  btn?.classList.add("active");

  showModal();
}

async function createTaskFromModal() {
  const title = (els.inputTitle?.value || "").trim();
  if (!title) return;

  const payload = {
    userId,
    title,
    description: (els.inputDesc?.value || "").trim(),
    category: els.inputCat?.value || "other",
    task_time: els.inputTime?.value || null,
    isDaily: els.inputRecurring?.checked ? 1 : 0,
    important: els.inputImportant?.checked ? 1 : 0,
    task_date: els.inputDate?.value || null,
    end_date: els.inputEndDate?.value || null,
    duration: els.inputDuration?.value ? Number(els.inputDuration.value) : null,
  };

  await api("/tasks", { method: "POST", body: JSON.stringify(payload) });
  closeModal();
  await refreshFromServer();
}

async function updateTaskFromModal() {
  if (!editingTaskId) return;

  const title = (els.inputTitle?.value || "").trim();
  if (!title) return;

  const payload = {
    userId,
    title,
    category: els.inputCat?.value || null,
    task_time: els.inputTime?.value || null,
    task_date: els.inputDate?.value || null,
    end_date: els.inputEndDate?.value || null,
    important: els.inputImportant?.checked ? 1 : 0,
    description: (els.inputDesc?.value || "").trim(),
    isDaily: els.inputRecurring?.checked ? 1 : 0,
    duration: els.inputDuration?.value ? Number(els.inputDuration.value) : null,
  };

  await api(`/tasks/${editingTaskId}`, { method: "PATCH", body: JSON.stringify(payload) });

  closeModal();
  editMode = false;
  editingTaskId = null;

  await refreshFromServer();
}

// -------------------------
// Completion / delete
// -------------------------
async function toggleComplete(task, checked) {
  const idNum = Number(task.id);

  if (completedTodaySet.has(idNum)) {
    const chk = document.getElementById(`chk-${task.id}`);
    if (chk) {
      chk.checked = true;
      chk.disabled = true;
    }
    return;
  }

  if (!checked) {
    const chk = document.getElementById(`chk-${task.id}`);
    if (chk) chk.checked = false;
    return;
  }

  const ok = await confirmDialog({
    title: "Mark task as completed?",
    message: `Did you complete "${task.title}"?`,
  });

  if (!ok) {
    const chk = document.getElementById(`chk-${task.id}`);
    if (chk) chk.checked = false;
    return;
  }

  await api(`/tasks/${task.id}/complete`, {
    method: "POST",
    body: JSON.stringify({ method: "manual" }),
  });

  await ensureNextDailyTask(task);
  await refreshFromServer();
}

async function deleteTask(taskId) {
  await api(`/tasks/${taskId}?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
  await refreshFromServer();
}

async function clearCompletedToday() {
  await api(`/tasks/completed?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
  await refreshFromServer();
}

// -------------------------
// Rendering
// -------------------------
function renderTasksOnly() {
  if (!els.container) return;

  const list = Array.isArray(filteredTasks) ? filteredTasks : [];

  if (!list.length) {
    els.container.style.display = "none";
    if (els.empty) els.empty.style.display = "block";
    return;
  }

  els.container.style.display = "grid";
  if (els.empty) els.empty.style.display = "none";

  els.container.innerHTML = list.map(cardHTML).join("");

  for (const t of list) {
    const chk = document.getElementById(`chk-${t.id}`);
    chk?.addEventListener("change", (e) => toggleComplete(t, e.target.checked));
    if (completedTodaySet.has(Number(t.id))) {
      chk.checked = true;
      chk.disabled = true;
    }

    document.getElementById(`edit-${t.id}`)?.addEventListener("click", () => openEditModal(t));
    document.getElementById(`del-${t.id}`)?.addEventListener("click", () => deleteTask(t.id));
  }
}

function cardHTML(t) {
  const cat = normalizeCategory(t.category);
  const doneToday = completedTodaySet.has(Number(t.id));
  const timeText = t.task_time ? formatTime(t.task_time) : "No time";

  let dateText = "No date";
  if (t.task_date) dateText = formatDate(t.task_date);
  else if (Number(t.isDaily) === 1) dateText = "Daily";

  const dailyBadge = Number(t.isDaily) === 1 ? ` <span class="task-badge task-badge-daily">Daily</span>` : "";
  const endText = t.end_date ? formatDate(t.end_date) : "";
  const rangeText = endText ? ` → ${endText}` : "";
  const desc = (t.description || "").trim();

  const editDisabledAttr = doneToday ? 'disabled aria-disabled="true"' : "";
  const editTitle = doneToday ? "Completed (cannot edit)" : "Edit";

  return `
    <div class="task-card ${cat}">
      <div class="task-header">
        <div>
          <div class="task-checkbox">
            <input type="checkbox" id="chk-${t.id}" ${doneToday ? "checked disabled" : ""}>
            <label for="chk-${t.id}" class="task-title">${escapeHTML(t.title)}</label>
          </div>

          ${desc ? `<p class="task-description">${escapeHTML(desc)}</p>` : `<p class="task-description"></p>`}
        </div>

        <div class="task-actions">
          <button class="task-action-btn" id="edit-${t.id}" title="${editTitle}" ${editDisabledAttr}>
            <i class="fas fa-edit"></i>
          </button>

          <button class="task-action-btn" id="del-${t.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div class="task-time">
        <i class="fas fa-calendar-day"></i>
        ${dateText}${dailyBadge}${rangeText}
      </div>

      <div class="task-meta">
        <div class="task-time">
          <i class="fas fa-clock"></i>
          ${timeText}
        </div>

        <span class="task-category ${cat}">
          ${categoryIcon(cat)} ${cap(cat)}
        </span>
      </div>
    </div>
  `;
}

async function refreshFromServer() {
  const list = await api(`/tasks/${userId}`, { method: "GET" });
  tasks = Array.isArray(list) ? list : [];

  const done = await api(`/tasks/completed/today/${userId}`, { method: "GET" });
  completedTodaySet = new Set((done?.completedToday || []).map(Number));

  applyFilter();
}

function updateProgress() {
  const total = tasks.length;
  const done = total === 0 ? 0 : completedTodaySet.size;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (els.progressFill) els.progressFill.style.width = `${pct}%`;
  if (els.progressPct) els.progressPct.textContent = `${pct}%`;
  if (els.progressText) els.progressText.textContent = `${done} of ${total} tasks completed`;
}

// -------------------------
// History view
// -------------------------
async function renderHistoryView() {
  if (!els.container) return;

  const todayISO = new Date().toISOString().slice(0, 10);

  els.container.style.display = "block";
  if (els.empty) els.empty.style.display = "none";

  els.container.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:16px;">
      <label style="font-weight:600; color:#2d3748;">Filter date:</label>
      <input type="date" id="history-date" value="${todayISO}" />
      <button class="btn-clear-completed" id="history-show-all" type="button">
        Show All
      </button>
    </div>
    <div id="history-list"></div>
  `;

  const input = document.getElementById("history-date");
  const showAllBtn = document.getElementById("history-show-all");

  async function load(dateStrOrNull) {
    const q = dateStrOrNull ? `?date=${encodeURIComponent(dateStrOrNull)}` : "";
    const data = await api(`/history/${userId}${q}`, { method: "GET" });
    const logs = data?.logs || [];

    const listEl = document.getElementById("history-list");
    if (!listEl) return;

    if (!logs.length) {
      listEl.innerHTML = `<p style="color:#718096; padding:20px;">No completed tasks found.</p>`;
      return;
    }

    listEl.innerHTML = logs.map(historyRowHTML).join("");
  }

  input?.addEventListener("change", () => load(input.value || null));
  showAllBtn?.addEventListener("click", () => load(null));

  await load(todayISO);
}

function historyRowHTML(row) {
  const cat = normalizeCategory(row.category);
  const when = new Date(row.completed_at);
  const dateText = when.toLocaleDateString("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeText = when.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

  return `
    <div class="task-card ${cat}" style="margin-bottom:12px;">
      <div class="task-header">
        <div>
          <div class="task-title">${escapeHTML(row.title)}</div>
          <p class="task-description">Completed: ${dateText} • ${timeText} (${escapeHTML(row.method || "manual")})</p>
        </div>
      </div>
      <div class="task-meta">
        <span class="task-category ${cat}">
          ${categoryIcon(cat)} ${cap(cat)}
        </span>
      </div>
    </div>
  `;
}

// -------------------------
// Confirm dialog (your existing modal)
// -------------------------
function confirmDialog({ title = "Are you sure?", message = "This action cannot be undone." }) {
  const overlay = document.getElementById("confirm-modal-overlay");
  const titleEl = document.getElementById("confirm-title");
  const msgEl = document.getElementById("confirm-message");
  const cancelBtn = document.getElementById("confirm-cancel-btn");
  const okBtn = document.getElementById("confirm-ok-btn");

  if (!overlay || !titleEl || !msgEl || !cancelBtn || !okBtn) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  titleEl.textContent = title;
  msgEl.textContent = message;
  overlay.style.display = "flex";

  return new Promise((resolve) => {
    const cleanup = () => {
      overlay.style.display = "none";
      cancelBtn.removeEventListener("click", onCancel);
      okBtn.removeEventListener("click", onOk);
      overlay.removeEventListener("click", onOverlay);
      document.removeEventListener("keydown", onEsc);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onOk = () => {
      cleanup();
      resolve(true);
    };
    const onOverlay = (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        cleanup();
        resolve(false);
      }
    };

    cancelBtn.addEventListener("click", onCancel);
    okBtn.addEventListener("click", onOk);
    overlay.addEventListener("click", onOverlay);
    document.addEventListener("keydown", onEsc);
  });
}

// -------------------------
// UI wiring
// -------------------------
function wireUI() {
  els.addBtn?.addEventListener("click", openCreateModal);
  els.addEmptyBtn?.addEventListener("click", openCreateModal);

  els.closeModalBtn?.addEventListener("click", closeModal);
  els.cancelModalBtn?.addEventListener("click", closeModal);

  els.modalOverlay?.addEventListener("click", (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });

  els.allLink?.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilter = "all";
    applyFilter();
  });

  els.todayLink?.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilter = "today";
    applyFilter();
  });

  els.importantLink?.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilter = "important";
    applyFilter();
  });

  els.completedLink?.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilter = "completed";
    applyFilter();
  });

  els.pendingLink?.addEventListener("click", (e) => {
    e.preventDefault();
    currentFilter = "pending";
    applyFilter();
  });

  els.historyLink?.addEventListener("click", async (e) => {
    e.preventDefault();
    currentFilter = "history";
    els.filterTitle && (els.filterTitle.textContent = "History");
    setActiveSidebar("history-link");
    await renderHistoryView();
  });

  els.categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.categoryButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (els.inputCat) els.inputCat.value = btn.dataset.category || "other";
    });
  });

  els.taskForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (editMode) await updateTaskFromModal();
    else await createTaskFromModal();
  });

  els.clearCompletedBtn?.addEventListener("click", async () => {
    await clearCompletedToday();
  });
}

// -------------------------
// Start
// -------------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    renderHeaderAuthUI();

    // ✅ role protection
    if (!requireUserOrRedirect()) return;

    renderTodayDate();

    user = getCurrentUser();
    userId = getUserIdStrict(user);

    wireUI();
    await refreshFromServer();
  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to load tasks");
  }
});
