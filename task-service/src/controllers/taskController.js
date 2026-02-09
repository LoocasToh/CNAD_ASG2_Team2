const {
  createTask,
  getTasksByUser,
  getTodayTasks,
  updateTask,
  deleteTask,
  findTaskById,
  logCompletion,
  getLogsByUser,
  getCompletedTaskIdsToday,
  getHistory,
} = require("../models/taskModel");

// ✅ NOT async
function todaySG() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); // YYYY-MM-DD
}

async function create(req, res) {
  try {
    const {
      userId,
      title,
      task_time,
      category,
      task_date,
      end_date,
      important,
      description,
      isDaily,
    } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }

    const task = await createTask({
      userId,
      title,
      task_time,
      category,
      task_date: task_date || null,
      end_date: end_date || null,
      important: important ? 1 : 0,
      description: description || null,
      isDaily: isDaily ? 1 : 0,
    });

    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function all(req, res) {
  try {
    const userId = Number(req.params.userId);
    const tasks = await getTasksByUser(userId);
    return res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function today(req, res) {
  try {
    const userId = Number(req.params.userId);
    const dateStr = req.query.date || todaySG();
    const tasks = await getTodayTasks(userId, dateStr);
    return res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function edit(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    const updated = await updateTask(taskId, req.body);
    if (!updated) return res.status(400).json({ error: "no fields to update" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function remove(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    await deleteTask(taskId);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function complete(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    const task = await findTaskById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    const userId = task.userId; // or req.user.userId if you want stricter security
    const method = req.body?.method || "manual";

    const log = await logCompletion({ taskId, userId, method });
    return res.json({ ok: true, log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function logs(req, res) {
  try {
    const userId = Number(req.params.userId);
    const rows = await getLogsByUser(userId);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function completedToday(req, res) {
  try {
    const userId = Number(req.params.userId);
    const dateStr = req.query.date || todaySG();
    const ids = await getCompletedTaskIdsToday(userId, dateStr);
    return res.json({ completedToday: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function history(req, res) {
  try {
    const userId = Number(req.params.userId);
    const date = req.query.date || null; // YYYY-MM-DD
    const rows = await getHistory(userId, date);
    return res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

module.exports = {
  create,
  all,
  today,
  edit,
  remove,
  complete,
  logs,
  completedToday,
  history,
};
