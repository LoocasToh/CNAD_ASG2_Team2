// Mock PWID + task data (replace with API later)
const data = {
  alex: {
    name: "Alex",
    tasks: {
      "2024-10-03": ["Eat", "Shower"],
      "2024-10-04": ["Medication"]
    }
  },
  jamie: {
    name: "Jamie",
    tasks: {
      "2024-10-03": ["Exercise"]
    }
  }
};

const pwidSelect = document.getElementById("pwidSelect");
const calendar = document.getElementById("calendar");
const taskList = document.getElementById("taskList");
const taskDateTitle = document.getElementById("taskDateTitle");

let selectedPWID = null;
let selectedDate = null;

// Populate PWIDs
Object.keys(data).forEach(id => {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = data[id].name;
  pwidSelect.appendChild(opt);
});

pwidSelect.onchange = () => {
  selectedPWID = pwidSelect.value;
  renderCalendar();
};

// Render simple calendar (30 days demo)
function renderCalendar() {
  calendar.innerHTML = "";
  for (let d = 1; d <= 30; d++) {
    const date = `2024-10-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.textContent = d;
    cell.onclick = () => selectDate(date, cell);
    calendar.appendChild(cell);
  }
}

function selectDate(date, cell) {
  selectedDate = date;
  document.querySelectorAll(".calendar div").forEach(c => c.classList.remove("active"));
  cell.classList.add("active");
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";
  taskDateTitle.textContent = `Tasks for ${selectedDate}`;

  const tasks = data[selectedPWID]?.tasks[selectedDate] || [];
  tasks.forEach((task, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `${task} <button onclick="deleteTask(${idx})">Delete</button>`;
    taskList.appendChild(li);
  });
}

window.deleteTask = (idx) => {
  data[selectedPWID].tasks[selectedDate].splice(idx, 1);
  renderTasks();
};

document.getElementById("addTaskBtn").onclick = () => {
  const input = document.getElementById("newTaskInput");
  if (!input.value || !selectedDate) return;

  data[selectedPWID].tasks[selectedDate] ??= [];
  data[selectedPWID].tasks[selectedDate].push(input.value);
  input.value = "";
  renderTasks();
};
