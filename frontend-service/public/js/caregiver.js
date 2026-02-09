document.addEventListener("DOMContentLoaded", () => {
  console.log("Caregiver dashboard loaded");

  /* =======================
     MOCK DATA (Frontend)
     ======================= */
  let currentYear = 2026;
  let currentMonth = 1; // February (0-based)

  const pwids = {
    alex: {
      name: "Alex",
      phone: "91234567",
      tasks: {
        "2024-10-05": ["Eat", "Medication"],
        "2024-10-06": ["Shower"]
      }
    },
    jamie: {
      name: "Jamie",
      phone: "98765432",
      tasks: {
        "2024-10-05": ["Exercise"]
      }
    }
  };

  /* =======================
     DOM ELEMENTS
     ======================= */
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

  let selectedPWID = null;
  let selectedDate = null;

  // ✅ Start disabled (until PWID chosen)
  callPWIDBtn.disabled = true;

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  /* =======================
     INIT
     ======================= */
  function init() {
    populatePWIDs();
    populateMonthYear();
    renderCalendar();
  }

  function populatePWIDs() {
    Object.keys(pwids).forEach(id => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = pwids[id].name;
      pwidSelect.appendChild(option);
    });
  }

  function populateMonthYear() {
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

    monthSelect.value = currentMonth;
    yearSelect.value = currentYear;
  }

  monthSelect.addEventListener("change", () => {
    currentMonth = parseInt(monthSelect.value);
    renderCalendar();
  });

  yearSelect.addEventListener("change", () => {
    currentYear = parseInt(yearSelect.value);
    renderCalendar();
  });

  /* =======================
     EVENT LISTENERS
     ======================= */
  pwidSelect.addEventListener("change", () => {
    selectedPWID = pwidSelect.value || null;
    selectedDate = null;

    // ✅ enable only if PWID selected
    callPWIDBtn.disabled = !selectedPWID;

    renderCalendar();
    taskList.innerHTML = "";
    taskDateTitle.textContent = "Tasks";

    // optional: update progress when PWID changes
    updateProgress();
  });

  addTaskBtn.addEventListener("click", () => {
    if (!selectedPWID || !selectedDate) return;

    const taskName = newTaskInput.value.trim();
    if (!taskName) return;

    pwids[selectedPWID].tasks[selectedDate] ??= [];
    pwids[selectedPWID].tasks[selectedDate].push(taskName);

    newTaskInput.value = "";
    renderTasks();
    updateProgress();
  });

  callPWIDBtn.addEventListener("click", () => {
    if (!selectedPWID) return;
    const phone = pwids[selectedPWID].phone;
    // window.location.href = `tel:${phone}`;
    console.log("Call PWID:", phone);
  });

  /* =======================
     CALENDAR
     ======================= */
  function renderCalendar() {
    calendar.innerHTML = "";

    const year = currentYear;
    const month = currentMonth;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // leading empty cells
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-day empty";
      calendar.appendChild(empty);
    }

    // actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const cell = document.createElement("div");
      cell.className = "calendar-day";

      const number = document.createElement("div");
      number.className = "calendar-day-number";
      number.textContent = day;
      cell.appendChild(number);

      // dot if tasks exist
      if (selectedPWID && pwids[selectedPWID].tasks[date]?.length) {
        const dot = document.createElement("div");
        dot.className = "calendar-dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", () => {
        selectedDate = date;
        renderCalendar();
        renderTasks();
      });

      if (date === selectedDate) {
        cell.classList.add("active");
      }

      calendar.appendChild(cell);
    }
  }

  /* =======================
     TASKS
     ======================= */
  function renderTasks() {
    taskList.innerHTML = "";
    taskDateTitle.textContent = selectedDate ? `Tasks for ${selectedDate}` : "Tasks";

    if (!selectedPWID || !selectedDate) return;

    const tasks = pwids[selectedPWID].tasks[selectedDate] || [];

    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${task}
        <button data-index="${index}">Delete</button>
      `;

      li.querySelector("button").addEventListener("click", () => {
        deleteTask(index);
      });

      taskList.appendChild(li);
    });
  }

  function deleteTask(index) {
    if (!selectedPWID || !selectedDate) return;
    pwids[selectedPWID].tasks[selectedDate].splice(index, 1);
    renderTasks();
    updateProgress();
  }

  /* =======================
     PROGRESS BAR
     ======================= */
  function updateProgress() {
    if (!selectedPWID) {
      progressBar.style.width = "0%";
      progressText.textContent = "0% completed";
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const tasks = pwids[selectedPWID].tasks[today] || [];

    // mock: assume completed = total
    const completed = tasks.length;
    const total = tasks.length || 1;

    const percent = Math.round((completed / total) * 100);

    progressBar.style.width = percent + "%";
    progressText.textContent = `${percent}% completed`;
  }

  /* =======================
     START APP
     ======================= */
  init();
});
