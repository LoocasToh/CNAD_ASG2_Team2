// =========================
// DailyTasks Dynamic (MySQL-backed)
// Uses your existing HTML IDs + CSS classes
// - Opens "Add Task" modal
// - Creates task via task-service (8081)
// - Renders tasks + updates progress bar
// - Logs completion via task_logs
// - Deletes tasks + clears completed (today)
// - Redirect logout -> Index.html
// =========================

const API_BASE = window.API_BASE_URL || 'http://localhost:8081'; // task-service
const LOGIN_PAGE = 'LoginScreen.html';
const INDEX_PAGE = 'Index.html';

// ----- AUTH / USER -----
function getCurrentUser() {
  return (
    JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser')) ||
    null
  );
}

function getUserIdStrict(user) {
  // DB expects INT
  const id = user?.id ?? user?.userId ?? user?._id;

  const n = Number(id);
  if (Number.isFinite(n) && n > 0) return n;

  const stored = localStorage.getItem('careCompanionUserId');
  const ns = Number(stored);
  if (Number.isFinite(ns) && ns > 0) return ns;

  throw new Error(
    `UserId is not numeric (${id}). Your tasks.userId is INT, so either:
- change DB userId to VARCHAR, or
- ensure auth returns numeric userId.`
  );
}

function getToken() {
  return localStorage.getItem('careCompanionToken') || '';
}

// Logout: clear session and redirect to Index.html (your request)
function handleLogout(e) {
  if (e) e.preventDefault();

  localStorage.removeItem('careCompanionToken');
  localStorage.removeItem('careCompanionUser');
  localStorage.removeItem('careCompanionRemember');
  sessionStorage.removeItem('careCompanionUser');

  // optional cleanup (if you used these)
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');

  window.location.href = INDEX_PAGE;
}

// Put user name into the header label
function renderUserName() {
  const el = document.getElementById('headerUserName');
  if (!el) return;

  const user =
    JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser'));

  let label = user?.name || user?.username || user?.email || 'Guest';
  if (typeof label === 'string' && label.includes('@')) label = label.split('@')[0];

  el.textContent = label;
}

// Protect page if not logged in
function requireLogin() {
  const user =
    JSON.parse(localStorage.getItem('careCompanionUser')) ||
    JSON.parse(sessionStorage.getItem('careCompanionUser'));

  if (!user) {
    window.location.href = LOGIN_PAGE;
    return false;
  }
  return true;
}

// ----- UI refs -----
const els = {
  container: document.getElementById('task-cards-container'),
  empty: document.getElementById('empty-state'),

  progressFill: document.getElementById('progress-fill'),
  progressPct: document.getElementById('progress-percentage'),
  progressText: document.getElementById('progress-text'),

  addBtn: document.getElementById('add-task-btn'),
  addEmptyBtn: document.getElementById('add-task-empty-btn'),
  clearCompletedBtn: document.getElementById('clear-completed-btn'),

  modalOverlay: document.getElementById('task-modal-overlay'),
  modalTitle: document.getElementById('modal-title'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-task-btn'),
  taskForm: document.getElementById('task-form'),

  inputTitle: document.getElementById('task-title'),
  inputDesc: document.getElementById('task-description'),
  inputCat: document.getElementById('task-category'),
  inputTime: document.getElementById('task-time'),
  inputDuration: document.getElementById('task-duration'),
  inputImportant: document.getElementById('task-important'),
  inputRecurring: document.getElementById('task-recurring'),
  inputDate: document.getElementById('task-date'),
  inputEndDate: document.getElementById('task-end-date'),


  categoryButtons: document.querySelectorAll('.category-btn'),

    // sidebar filter links
  allLink: document.getElementById('all-tasks-link'),
  todayLink: document.getElementById('today-tasks-link'),
  importantLink: document.getElementById('important-tasks-link'),
  completedLink: document.getElementById('completed-tasks-link'),
  pendingLink: document.getElementById('pending-tasks-link'),

  // sidebar <li> items (for active highlight)
  sidebarItems: document.querySelectorAll('.sidebar-menu li'),

  // title at top
  filterTitle: document.getElementById('current-filter-title'),


  // header auth
  logoutLink: document.getElementById('logout-link'),
};

let user = null;
let userId = null;
let tasks = [];
let completedTodaySet = new Set();

let currentFilter = 'all';      // all | today | important | completed | pending
let filteredTasks = [];         // tasks to show in UI
let editMode = false;
let editingTaskId = null;

function setActiveSidebar(id) {
  els.sidebarItems?.forEach(li => li.classList.remove('active'));
  const link = document.getElementById(id);
  const li = link?.closest('li');
  li?.classList.add('active');
}

function localYMD(d = new Date()) {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // local YYYY-MM-DD
}

function applyFilter() {
  const list = Array.isArray(tasks) ? tasks : [];
  const todayLocal = localYMD(new Date());

  if (currentFilter === "today") {
    filteredTasks = list.filter((t) => {
      const isDaily = Number(t.isDaily) === 1;
      if (isDaily) return true;

      if (!t.task_date) return false;

      // Compare using LOCAL date
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

function openEditModal(task) {
  editMode = true;
  editingTaskId = task.id;

  if (els.modalTitle) els.modalTitle.textContent = 'Edit Task';

  // fill modal fields
  if (els.inputTitle) els.inputTitle.value = task.title || '';
  if (els.inputDesc) els.inputDesc.value = task.description || '';
  if (els.inputTime) els.inputTime.value = task.task_time ? String(task.task_time).slice(0, 5) : '';
  if (els.inputDuration) els.inputDuration.value = task.duration ?? '';

  if (els.inputImportant) els.inputImportant.checked = Number(task.important) === 1 || task.important === true;
  if (els.inputRecurring) els.inputRecurring.checked = Number(task.isDaily) === 1 || task.isDaily === true;

  // date input expects YYYY-MM-DD
  if (els.inputDate) {
    els.inputDate.value = task.task_date ? String(task.task_date).slice(0, 10) : '';
  }

  // category
  const cat = normalizeCategory(task.category);
  if (els.inputCat) els.inputCat.value = cat;
  els.categoryButtons?.forEach((b) => b.classList.remove('active'));
  const btn = Array.from(els.categoryButtons || []).find((b) => (b.dataset.category || '').toLowerCase() === cat);
  btn?.classList.add('active');

  showModal();
}

async function updateTaskFromModal() {
  if (!editingTaskId) return;

  const title = (els.inputTitle?.value || '').trim();
  if (!title) return;

  const payload = {
  userId,
  title,
  category: els.inputCat?.value || null,
  task_time: els.inputTime?.value || null,
  task_date: els.inputDate?.value || null,
  end_date: els.inputEndDate?.value || null,
  important: els.inputImportant?.checked ? 1 : 0,
  description: (els.inputDesc?.value || '').trim(),
  isDaily: els.inputRecurring?.checked ? 1 : 0,
};


  // Your backend route is PATCH /tasks/:taskId
  await api(`/tasks/${editingTaskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  closeModal();
  editMode = false;
  editingTaskId = null;

  await refreshFromServer();
}

function openCreateModal() {
  editingTaskId = null; // IMPORTANT
  if (els.modalTitle) els.modalTitle.textContent = 'Add New Task';
  resetModal();
  showModal();
}

function normalizeTimeForInput(mysqlTime) {
  if (!mysqlTime) return '';
  // "14:05:00" -> "14:05"
  const parts = String(mysqlTime).split(':');
  if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  return '';
}

function normalizeDateForInput(mysqlDate) {
  if (!mysqlDate) return '';
  // If already "YYYY-MM-DD"
  if (typeof mysqlDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mysqlDate)) return mysqlDate;

  // If MySQL returns Date object string like "2026-02-08T00:00:00.000Z"
  const dt = new Date(mysqlDate);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}




document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!requireLogin()) return;

    renderUserName();
    renderTodayDate(); 
    els.logoutLink?.addEventListener('click', handleLogout);

    if (els.container) els.container.innerHTML = '';

    user = getCurrentUser();
    userId = getUserIdStrict(user);

    wireUI();
    await refreshFromServer();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Failed to load tasks');
  }
});



// -------------------------
// UI wiring
// -------------------------
function wireUI() {
  els.addBtn?.addEventListener('click', openCreateModal);
  els.addEmptyBtn?.addEventListener('click', openCreateModal);

  els.closeModalBtn?.addEventListener('click', closeModal);
  els.cancelModalBtn?.addEventListener('click', closeModal);

  // click outside closes
  els.modalOverlay?.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });

  // Sidebar filters
  els.allLink?.addEventListener('click', (e) => {
    e.preventDefault();
    currentFilter = 'all';
    applyFilter();
  });

  els.todayLink?.addEventListener('click', (e) => {
    e.preventDefault();
    currentFilter = 'today';
    applyFilter();
  });

  els.importantLink?.addEventListener('click', (e) => {
    e.preventDefault();
    currentFilter = 'important';
    applyFilter();
  });

  els.completedLink?.addEventListener('click', (e) => {
    e.preventDefault();
    currentFilter = 'completed';
    applyFilter();
  });

  els.pendingLink?.addEventListener('click', (e) => {
    e.preventDefault();
    currentFilter = 'pending';
    applyFilter();
  });

  els.historyLink?.addEventListener("click", async (e) => {
    e.preventDefault();
    currentFilter = "history";
    if (els.filterTitle) els.filterTitle.textContent = "History";
    setActiveSidebar("history-link");
    await renderHistoryView(); // new function
  });

  // category buttons set hidden input + active state
  els.categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.categoryButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (els.inputCat) els.inputCat.value = btn.dataset.category || 'other';
    });
  
    
  
  });

  // submit modal form
 els.taskForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (editMode) {
    await updateTaskFromModal();
  } else {
    await createTaskFromModal();
  }
});



  // clear completed (today)
  els.clearCompletedBtn?.addEventListener('click', async () => {
    await clearCompletedToday();
  });
}

function openCreateModal() {
  if (els.modalTitle) els.modalTitle.textContent = 'Add New Task';
  resetModal();
  showModal();
}

function resetModal() {
  if (els.inputTitle) els.inputTitle.value = '';
  if (els.inputDesc) els.inputDesc.value = '';
  if (els.inputTime) els.inputTime.value = '';
  if (els.inputDuration) els.inputDuration.value = '';
  if (els.inputImportant) els.inputImportant.checked = false;
  if (els.inputRecurring) els.inputRecurring.checked = false;
  if (els.inputEndDate) els.inputEndDate.value = '';

  // default category
  if (els.inputCat) els.inputCat.value = 'medication';
  els.categoryButtons.forEach((b) => b.classList.remove('active'));
  const medBtn = Array.from(els.categoryButtons).find((b) => b.dataset.category === 'medication');
  medBtn?.classList.add('active');
}

function showModal() {
  if (!els.modalOverlay) return;
  els.modalOverlay.style.display = 'flex';
  setTimeout(() => els.inputTitle?.focus(), 50);
}

function closeModal() {
  if (!els.modalOverlay) return;
  els.modalOverlay.style.display = 'none';

  editMode = false;
  editingTaskId = null;
}

async function renderHistoryView() {
  // Replace cards container with history layout
  if (!els.container) return;

  const todayISO = new Date().toISOString().slice(0, 10);

  els.container.style.display = "block";
  if (els.empty) els.empty.style.display = "none";

  els.container.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:16px;">
      <label style="font-weight:600; color:#2d3748;">Filter date:</label>
      <input type="date" id="history-date" value="${todayISO}" />
      <button class="btn-clear-completed" id="history-clear-date" type="button">
        Show All
      </button>
    </div>
    <div id="history-list"></div>
  `;

  const input = document.getElementById("history-date");
  const showAllBtn = document.getElementById("history-clear-date");

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

  // initial load for today
  await load(todayISO);
}

function historyRowHTML(row) {
  const cat = normalizeCategory(row.category);
  const when = new Date(row.completed_at);
  const dateText = when.toLocaleDateString("en-SG", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
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
// Server calls
// -------------------------
async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // optional JWT
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

// async function refreshFromServer() {
//   const list = await api(`/tasks/${userId}`, { method: "GET" });
//   tasks = Array.isArray(list) ? list : [];

//   const done = await api(`/tasks/completed/today/${userId}`, { method: "GET" });
//   completedTodaySet = new Set((done?.completedToday || []).map(Number));

//   applyFilter();
// }



async function createTaskFromModal() {
  const title = (els.inputTitle?.value || '').trim();
  if (!title) return;

  const payload = {
    userId,
    title,
    description: (els.inputDesc?.value || '').trim(), // backend may ignore if not supported
    category: els.inputCat?.value || 'other',
    task_time: els.inputTime?.value || null,
    isDaily: els.inputRecurring?.checked ? 1 : 0,
    important: els.inputImportant?.checked ? 1 : 0, // backend may ignore
    task_date: els.inputDate?.value || null,
    duration: els.inputDuration?.value ? Number(els.inputDuration.value) : null, // backend may ignore
    historyLink: document.getElementById("history-link"),
    end_date: els.inputEndDate?.value || null,
  };

  await api('/tasks', { method: 'POST', body: JSON.stringify(payload) });
  closeModal();
  await refreshFromServer();
}

async function toggleComplete(task, checked) {
  const idNum = Number(task.id);

  // If already completed, keep it checked + locked forever
  if (completedTodaySet.has(idNum)) {
    const chk = document.getElementById(`chk-${task.id}`);
    if (chk) {
      chk.checked = true;
      chk.disabled = true;
    }
    return;
  }

  // Block unchecking (not allowed)
  if (!checked) {
    const chk = document.getElementById(`chk-${task.id}`);
    if (chk) chk.checked = false;
    return;
  }

  // Confirm first
  const ok = await confirmDialog({
    title: "Mark task as completed?",
    message: `Did you complete "${task.title}"?`,
  });

  if (!ok) {
    const chk = document.getElementById(`chk-${task.id}`);
    if (chk) chk.checked = false; // revert UI
    return;
  }

  // Insert into logs (backend)
  await api(`/tasks/${task.id}/complete`, {
    method: "POST",
    body: JSON.stringify({ method: "manual" }),
  });

  // Update UI state + lock checkbox forever
  completedTodaySet.add(idNum);

  const chk = document.getElementById(`chk-${task.id}`);
  if (chk) {
    chk.checked = true;
    chk.disabled = true;
  }

  // Re-render so it moves into Completed tab immediately
  applyFilter();
}



async function deleteTask(taskId) {
  await api(`/tasks/${taskId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await refreshFromServer();
}

async function clearCompletedToday() {
  await api(`/tasks/completed?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await refreshFromServer();
}

// -------------------------
// Rendering
// -------------------------
function render() {
  renderTasksOnly();
  updateProgress();
}

function renderTasksOnly() {
  if (!els.container) return;

  const list = Array.isArray(filteredTasks) ? filteredTasks : [];

  if (!list.length) {
    els.container.style.display = 'none';
    if (els.empty) els.empty.style.display = 'block';
    return;
  }

  els.container.style.display = 'grid';
  if (els.empty) els.empty.style.display = 'none';

  els.container.innerHTML = list.map(cardHTML).join('');

  // wire per-card events
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

function formatDate(mysqlDate) {
  if (!mysqlDate) return '';

  // If it’s already "YYYY-MM-DD", keep it
  if (typeof mysqlDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mysqlDate)) {
    const [y, m, d] = mysqlDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const dt = new Date(mysqlDate);
  if (Number.isNaN(dt.getTime())) return String(mysqlDate);

  return dt.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
}



function cardHTML(t) {
  const cat = normalizeCategory(t.category);
  const doneToday = completedTodaySet.has(Number(t.id));
  const timeText = t.task_time ? formatTime(t.task_time) : 'No time';
  const dateText = t.task_date ? formatDate(t.task_date) : (t.isDaily ? 'Daily' : 'No date');
  const endText = t.end_date ? formatDate(t.end_date) : '';

  const desc = (t.description || '').trim();

  // ✅ disable edit if completed
  const editDisabledAttr = doneToday ? 'disabled aria-disabled="true"' : '';
  const editTitle = doneToday ? 'Completed (cannot edit)' : 'Edit';

  return `
    <div class="task-card ${cat}">
      <div class="task-header">
        <div>
          <div class="task-checkbox">
            <input type="checkbox" id="chk-${t.id}" ${doneToday ? 'checked disabled' : ''}>
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
        ${dateText}${endText ? ` → ${endText}` : ''}
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
// utilities
// -------------------------
function normalizeCategory(c) {
  const v = (c || 'other').toLowerCase();
  if (['medication', 'hygiene', 'meal', 'appointment', 'other'].includes(v)) return v;
  return 'other';
}

function categoryIcon(cat) {
  if (cat === 'medication') return `<i class="fas fa-pills"></i>`;
  if (cat === 'hygiene') return `<i class="fas fa-hands-wash"></i>`;
  if (cat === 'meal') return `<i class="fas fa-utensils"></i>`;
  if (cat === 'appointment') return `<i class="fas fa-calendar-check"></i>`;
  return `<i class="fas fa-ellipsis-h"></i>`;
}

function formatTime(mysqlTime) {
  // "14:05:00" or "14:05"
  const parts = String(mysqlTime).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] || '0');
  if (!Number.isFinite(h) || !Number.isFinite(m)) return mysqlTime;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderTodayDate() {
  const el = document.getElementById('current-date-display');
  if (!el) return;

  const now = new Date();
  el.textContent = now.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function confirmDialog({ title = "Are you sure?", message = "This action cannot be undone." }) {
  const overlay = document.getElementById("confirm-modal-overlay");
  const titleEl = document.getElementById("confirm-title");
  const msgEl = document.getElementById("confirm-message");
  const cancelBtn = document.getElementById("confirm-cancel-btn");
  const okBtn = document.getElementById("confirm-ok-btn");

  if (!overlay || !titleEl || !msgEl || !cancelBtn || !okBtn) {
    // fallback if modal missing
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

    const onCancel = () => { cleanup(); resolve(false); };
    const onOk = () => { cleanup(); resolve(true); };
    const onOverlay = (e) => {
      if (e.target === overlay) { cleanup(); resolve(false); }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") { cleanup(); resolve(false); }
    };

    cancelBtn.addEventListener("click", onCancel);
    okBtn.addEventListener("click", onOk);
    overlay.addEventListener("click", onOverlay);
    document.addEventListener("keydown", onEsc);
  });
}
