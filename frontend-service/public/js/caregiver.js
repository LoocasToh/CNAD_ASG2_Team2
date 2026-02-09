document.addEventListener("DOMContentLoaded", () => {
  console.log("Caregiver dashboard loaded (backend mode)");

  // =======================
  // CONFIG
  // =======================
  const API_BASE = window.API_BASE_URL || "http://localhost:8081"; // task-service
  const TOKEN_KEY = "careCompanionToken";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

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

  // =======================
  // DATE HELPERS
  // =======================
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function localYMD(d = new Date()) {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  }

  function toYMD(task_date) {
    if (typeof task_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task_date)) return task_date;
    const dt = new Date(task_date);
    if (Number.isNaN(dt.getTime())) return null;
    return localYMD(dt);
  }

  // =======================
  // STATE
  // =======================
  let currentYear = 2026;
  let currentMonth = 1; // Feb (0-based)

  const pwids = {
    alex: { userId: 2, name: "Alex", phone: "91234567" },
    jamie: { userId: 3, name: "Jamie", phone: "98765432" },
  };

  let selectedPWIDKey = null;
  let selectedUserId = null;
  let selectedDate = null;

  let allTasks = [];
  let tasksByDate = new Map();

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  // =======================
  // DOM ELEMENTS
  // =======================
  const pwidSelect = document.getElementById("pwidSelect");
  const calendar = document.getElementById("calendar");
  const taskList = document.getElementById("taskList");
  const taskDateTitle = document.getElementById("taskDateTitle");
  const newTaskInput = document.getElementById("newTaskInput");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const callPWIDBtn = document.getElementById("callPWIDBtn");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");

  const chartHint = document.getElementById("chartHint");
  const completionChartCanvas = document.getElementById("completionChart");
  let completionChart = null;

  callPWIDBtn.disabled = true;

  // =======================
  // INIT
  // =======================
  function init() {
    populatePWIDs();
    populateMonthYear();
    renderCalendar();

    // ✅ At start, no PWID/date selected
    setProgressHint();
    renderCompletionChart([]);
  }

  function setProgressHint() {
    progressBar.style.width = "0%";
    progressText.textContent = "Select a PWID and date to view progress";
  }

  function populatePWIDs() {
    while (pwidSelect.options.length > 1) pwidSelect.remove(1);

    Object.keys(pwids).forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${pwids[key].name} (ID: ${pwids[key].userId})`;
      pwidSelect.appendChild(opt);
    });
  }

  function populateMonthYear() {
    monthSelect.innerHTML = "";
    yearSelect.innerHTML = "";

    months.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    for (let y = 2024; y <= 2028; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }

    monthSelect.value = String(currentMonth);
    yearSelect.value = String(currentYear);
  }

  // =======================
  // EVENTS
  // =======================
  monthSelect.addEventListener("change", async () => {
    currentMonth = parseInt(monthSelect.value, 10);
    renderCalendar();
    await refreshChart();
  });

  yearSelect.addEventListener("change", async () => {
    currentYear = parseInt(yearSelect.value, 10);
    renderCalendar();
    await refreshChart();
  });

  pwidSelect.addEventListener("change", async () => {
    selectedPWIDKey = pwidSelect.value || null;
    selectedDate = null;

    callPWIDBtn.disabled = !selectedPWIDKey;

    taskList.innerHTML = "";
    taskDateTitle.textContent = "Tasks";

    if (!selectedPWIDKey) {
      selectedUserId = null;
      allTasks = [];
      tasksByDate = new Map();
      renderCalendar();
      setProgressHint();
      renderCompletionChart([]);
      chartHint.textContent = "Select a PWID to view completion rate for the selected month.";
      return;
    }

    selectedUserId = Number(pwids[selectedPWIDKey].userId);

    try {
      await loadPWIDTasks();
      renderCalendar();

      // ✅ PWID selected but no date yet
      progressBar.style.width = "0%";
      progressText.textContent = "Select a date to view progress";

      await refreshChart();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load tasks for PWID");
    }
  });

  addTaskBtn.addEventListener("click", async () => {
    if (!selectedUserId || !selectedDate) return;

    const title = newTaskInput.value.trim();
    if (!title) return;

    const payload = {
      userId: selectedUserId,
      title,
      category: "other",
      task_date: selectedDate,
      task_time: null,
      important: 0,
      isDaily: 0,
    };

    try {
      await api(`/tasks`, { method: "POST", body: JSON.stringify(payload) });
      newTaskInput.value = "";
      await loadPWIDTasks();
      renderCalendar();
      renderTasks();
      await updateProgress();   // ✅ refresh progress for selectedDate
      await refreshChart();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add task");
    }
  });

  callPWIDBtn.addEventListener("click", () => {
    if (!selectedPWIDKey) return;
    const phone = pwids[selectedPWIDKey].phone;
    console.log("Call PWID:", phone);
  });

  // =======================
  // BACKEND LOAD
  // =======================
  async function loadPWIDTasks() {
    if (!selectedUserId) return;

    const list = await api(`/tasks/${selectedUserId}`, { method: "GET" });
    allTasks = Array.isArray(list) ? list : [];

    tasksByDate = new Map();
    for (const t of allTasks) {
      const ymd = toYMD(t.task_date);
      const isDaily = Number(t.isDaily) === 1;

      if (!isDaily && ymd) {
        if (!tasksByDate.has(ymd)) tasksByDate.set(ymd, []);
        tasksByDate.get(ymd).push(t);
      }
    }
  }

  // =======================
  // CALENDAR
  // =======================
  function renderCalendar() {
    calendar.innerHTML = "";

    const year = currentYear;
    const month = currentMonth;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-day empty";
      calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${pad2(month + 1)}-${pad2(day)}`;

      const cell = document.createElement("div");
      cell.className = "calendar-day";

      const number = document.createElement("div");
      number.className = "calendar-day-number";
      number.textContent = day;
      cell.appendChild(number);

      if (selectedUserId && tasksByDate.has(date) && tasksByDate.get(date).length > 0) {
        const dot = document.createElement("div");
        dot.className = "calendar-dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", async () => {
        selectedDate = date;
        renderCalendar();
        renderTasks();
        await updateProgress(); // ✅ only compute progress after date selected
      });

      if (date === selectedDate) cell.classList.add("active");

      calendar.appendChild(cell);
    }
  }

  // =======================
  // TASK LIST
  // =======================
  function getTasksForSelectedDate() {
    if (!selectedUserId || !selectedDate) return [];

    const daily = allTasks.filter((t) => Number(t.isDaily) === 1);
    const dated = allTasks.filter((t) => toYMD(t.task_date) === selectedDate && Number(t.isDaily) !== 1);

    return [...daily, ...dated];
  }

  function renderTasks() {
    taskList.innerHTML = "";
    taskDateTitle.textContent = selectedDate ? `Tasks for ${selectedDate}` : "Tasks";

    if (!selectedUserId || !selectedDate) return;

    const list = getTasksForSelectedDate();

    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "No tasks for this date.";
      taskList.appendChild(li);
      return;
    }

    for (const t of list) {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.justifyContent = "space-between";
      li.style.gap = "10px";

      const titleSpan = document.createElement("span");
      titleSpan.textContent = t.title;

      const btnWrap = document.createElement("div");
      btnWrap.style.display = "flex";
      btnWrap.style.gap = "8px";

      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Complete";
      completeBtn.addEventListener("click", () => completeTask(t.id));

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteTask(t.id));

      btnWrap.appendChild(completeBtn);
      btnWrap.appendChild(delBtn);

      li.appendChild(titleSpan);
      li.appendChild(btnWrap);
      taskList.appendChild(li);
    }
  }

  async function deleteTask(taskId) {
    if (!selectedUserId || !taskId) return;

    try {
      await api(`/tasks/${taskId}?userId=${encodeURIComponent(selectedUserId)}`, { method: "DELETE" });
      await loadPWIDTasks();
      renderCalendar();
      renderTasks();
      await updateProgress();
      await refreshChart();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete task");
    }
  }

async function completeTask(taskId) {
  if (!selectedUserId || !taskId) return;

  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  try {
    const resp = await api(
      `/tasks/${taskId}/complete?userId=${encodeURIComponent(selectedUserId)}&date=${encodeURIComponent(selectedDate)}`,
      {
        method: "POST",
        body: JSON.stringify({ method: "manual" }),
      }
    );

    await updateProgress();  // now updates for selectedDate
    await refreshChart();    // now chart will show the correct day

    if (resp?.alreadyCompletedToday) {
      alert("Already completed for this date.");
    } else {
      alert("Task marked as completed!");
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to complete task");
  }
}

  // =======================
  // ✅ PROGRESS (DATE-BASED)
  // =======================
  async function updateProgress() {
    if (!selectedUserId || !selectedDate) {
      progressBar.style.width = "0%";
      progressText.textContent = "Select a date to view progress";
      return;
    }

    try {
      const data = await api(
        `/analytics/progress/day?userId=${encodeURIComponent(selectedUserId)}&date=${encodeURIComponent(selectedDate)}`,
        { method: "GET" }
      );

      const expected = Number(data?.expected ?? 0);
      const completed = Number(data?.completed ?? 0);
      const percent = Number(data?.percent ?? 0);

      if (expected === 0) {
        progressBar.style.width = "0%";
        progressText.textContent = "No tasks for this date";
        return;
      }

      progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      progressText.textContent = `${completed}/${expected} completed (${Math.round(percent)}%)`;
    } catch (err) {
      console.warn("Progress analytics not available:", err.message);
      progressBar.style.width = "0%";
      progressText.textContent = "0% completed";
    }
  }

  // =======================
  // CHART (Monthly Completion Daily)
  // =======================
  async function refreshChart() {
    if (!selectedUserId) {
      renderCompletionChart([]);
      return;
    }

    const year = currentYear;
    const month1to12 = currentMonth + 1;

    chartHint.textContent = `Showing daily completion rate for ${pwids[selectedPWIDKey].name} (${year}-${pad2(month1to12)})`;

    try {
      const rows = await api(
        `/analytics/completion/daily?userId=${encodeURIComponent(selectedUserId)}&year=${encodeURIComponent(year)}&month=${encodeURIComponent(month1to12)}`,
        { method: "GET" }
      );

      renderCompletionChart(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn("Chart analytics not available:", err.message);
      renderCompletionChart([]);
    }
  }

  function renderCompletionChart(rows) {
    const labels = rows.map((r) => r.date.slice(-2));
    const data = rows.map((r) => Number(r.rate || 0));

    if (completionChart) {
      completionChart.destroy();
      completionChart = null;
    }

    if (!completionChartCanvas) return;

    completionChart = new Chart(completionChartCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Completion Rate (%)",
            data,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { callback: (v) => `${v}%` },
          },
        },
      },
    });
  }

  // =======================
  // START
  // =======================
  init();
});
