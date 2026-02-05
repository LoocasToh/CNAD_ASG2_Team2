// DailyTasks.js

const dayButtons = document.querySelectorAll(".day-selector button");
const taskCards = document.querySelectorAll(".task-card");
const emergencyBtn = document.getElementById("emergencyCallBtn");
const sidebarItems = document.querySelectorAll(".sidebar li");
const signupForm = document.getElementById("signupForm");
const addTaskButtons = document.querySelectorAll(".add-task");
const USER_ICON_URL = "/Images/download.png";

// Function to show only the selected day's task card
if (dayButtons && taskCards) {
  function showDay(day) {
    taskCards.forEach((card) => {
      if (card.dataset.day === day) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });

    dayButtons.forEach((btn) => {
      if (btn.dataset.day === day) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // Add click event to day buttons
  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showDay(button.dataset.day);
    });
  });

  // Show Monday by default
  showDay("Mon");
}

// Emergencies.js

if (sidebarItems && emergencyBtn) {
  let holdTimer = null;
  const HOLD_TIME = 3000; // 3 seconds

  emergencyBtn.addEventListener("mousedown", startHold);
  emergencyBtn.addEventListener("touchstart", startHold);

  emergencyBtn.addEventListener("mouseup", cancelHold);
  emergencyBtn.addEventListener("mouseleave", cancelHold);
  emergencyBtn.addEventListener("touchend", cancelHold);

  function startHold() {
    emergencyBtn.textContent = "Holding…";

    holdTimer = setTimeout(() => {
      emergencyBtn.textContent = "Calling…";
      window.location.href = "tel:995";
    }, HOLD_TIME);
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    emergencyBtn.textContent = "🚨 Emergency Call";
  }

  sidebarItems.forEach((item) => {
    if (item.classList.contains("disabled")) {
      item.addEventListener("click", (e) => {
        e.preventDefault();
      });
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("UsernameInput").value;
    const email = document.getElementById("EmailInput").value;
    const password = document.getElementById("PasswordInput").value;
    const confirmPassword = document.getElementById(
      "ConfirmPasswordInput",
    ).value;
    const role = document.getElementById("RoleSelect").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    alert(`Registered as ${role}: ${username} (${email})`);

    // TODO: Send username, email, password, role to backend for account creation
  });
}

if (dayButtons.length && taskCards.length && addTaskButtons.length) {
  // Map weekdays to date string (format YYYY-MM-DD)
  function loadTasks(dayName) {
    const card = document.querySelector(`.task-card[data-day='${dayName}']`);
    const ul = card.querySelector(".task-list");
    ul.innerHTML = "";

    // Map day to date string
    const dateStr = getDateForDay(dayName);

    // Get tasks from localStorage
    const tasksObj = JSON.parse(localStorage.getItem("tasks")) || {};
    const tasks = tasksObj[dateStr] || [];

    // Populate task list
    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `${dayName}-task-${index}`;
      const label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = task;
      li.appendChild(checkbox);
      li.appendChild(label);
      ul.appendChild(li);
    });
  }

  // Map weekday to actual date
  function getDateForDay(dayName) {
    const today = new Date();
    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayIndex = today.getDay();
    const targetIndex = dayMap.indexOf(dayName);
    const diff = targetIndex - todayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.toISOString().split("T")[0];
  }

  // Show only the selected day
  function showDay(dayName) {
    dayButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.day === dayName);
    });
    taskCards.forEach((card) => {
      card.style.display = card.dataset.day === dayName ? "block" : "none";
    });

    loadTasks(dayName);
  }

  // ===== Add Task Functionality =====
  addTaskButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".task-card");
      const day = card.dataset.day;
      const taskName = prompt("Enter task name:", "New Task Placeholder");
      if (!taskName) return;

      const dateStr = getDateForDay(day);
      const tasksObj = JSON.parse(localStorage.getItem("tasks")) || {};

      if (!tasksObj[dateStr]) tasksObj[dateStr] = [];

      // Prevent duplicates
      if (!tasksObj[dateStr].includes(taskName)) {
        tasksObj[dateStr].push(taskName);
      }

      localStorage.setItem("tasks", JSON.stringify(tasksObj));
      loadTasks(day);
    });
  });

  // ===== Day Selector Buttons =====
  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => showDay(btn.dataset.day));
  });

  // ===== Initialize =====
  const todayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date().getDay()
  ];
  showDay(todayName);
}

document.addEventListener("DOMContentLoaded", () => {
  const LoginButton = document.getElementById("LoginButton");
const SignUpButton = document.getElementById("SignUpButton");
  const authArea = document.getElementById("auth-area");

  if (!authArea) return;

  function renderLoggedOut() {
    authArea.innerHTML = `
            <a href="/HTML/LoginScreen.html" id="login-link">Login</a>
        `;
    localStorage.removeItem("isLoggedIn");
  }

  function renderLoggedIn() {
    authArea.innerHTML = `
            <div class="user-menu">
                <img src="${USER_ICON_URL}" alt="User Icon" class="user-icon">
                <div class="user-dropdown">
                    <button id="logout-btn">Logout</button>
                </div>
            </div>
        `;

    document.getElementById("logout-btn").addEventListener("click", () => {
      renderLoggedOut();
      window.location.href = "/HTML/Index.html";
    });
  }

  // Initial state
  if (localStorage.getItem("isLoggedIn") === "true") {
    renderLoggedIn();
  } else {
    renderLoggedOut();
  }

  // Expose for login/signup pages
  window.fakeLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    renderLoggedIn();
  };

  if (LoginButton) {
    LoginButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.fakeLogin();
      window.location.href = "/HTML/Index.html";
    });
  }

  if (SignUpButton) {
    SignUpButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.fakeLogin();
      window.location.href = "/HTML/Index.html";
    });
  }
});

if (taskCards) {
  taskCards.forEach((card) => {
    const day = card.dataset.day;
    const taskList = card.querySelector(".task-list");
    const addBtn = card.querySelector(".add-task");

    function loadTasks() {
      const tasks = JSON.parse(localStorage.getItem(`tasks-${day}`)) || [];
      taskList.innerHTML = "";

      tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <input type="checkbox" id="${day}-task-${index}">
          <label for="${day}-task-${index}">${task}</label>
        `;
        taskList.appendChild(li);
      });
    }

    addBtn.addEventListener("click", () => {
      const taskText = prompt(`Add a task for ${day}:`);
      if (!taskText || taskText.trim() === "") return;

      const tasks = JSON.parse(localStorage.getItem(`tasks-${day}`)) || [];
      tasks.push(taskText.trim());
      localStorage.setItem(`tasks-${day}`, JSON.stringify(tasks));
      loadTasks();
    });

    loadTasks();
  });
}

// =============================
// User Icon Dropdown Behavior
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const authArea = document.getElementById("auth-area");
  if (!authArea) return;

  const userMenu = authArea.querySelector(".user-menu");
  if (!userMenu) return; // Exit if not logged in

  const userDropdown = userMenu.querySelector(".user-dropdown");
  const logoutBtn = userDropdown.querySelector("#logout-btn");

  // Delay for hiding dropdown
  let hoverTimeout;

  // Show dropdown when hovering over icon
  userMenu.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimeout);
    userMenu.classList.add("hovered");
  });

  // Start delay when mouse leaves icon
  userMenu.addEventListener("mouseleave", () => {
    hoverTimeout = setTimeout(() => {
      userMenu.classList.remove("hovered");
    }, 500); // 0.5s delay before hiding
  });

  // Keep dropdown visible while hovering dropdown itself
  userDropdown.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimeout);
    userMenu.classList.add("hovered");
  });
  userDropdown.addEventListener("mouseleave", () => {
    hoverTimeout = setTimeout(() => {
      userMenu.classList.remove("hovered");
    }, 500);
  });

  // Logout button click effect
  logoutBtn.addEventListener("mousedown", () => {
    logoutBtn.style.backgroundColor = "#f1f5f9"; // Light click effect
  });
  logoutBtn.addEventListener("mouseup", () => {
    logoutBtn.style.backgroundColor = ""; // Reset after click
  });
  logoutBtn.addEventListener("click", () => {
    // Reset login state and redirect
    localStorage.removeItem("isLoggedIn");
    window.location.href = "/HTML/Index.html";
  });
});
