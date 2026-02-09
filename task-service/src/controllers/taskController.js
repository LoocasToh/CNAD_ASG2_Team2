// controllers/taskController.js

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
  // YYYY-MM-DD in Singapore time
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

async function create(req, res) {
  try {
    const {
      userId,
      title,
      task_time = null,
      category = null,
      task_date = null,
      end_date = null,
      important = 0,
      description = null,
      isDaily = 0,
    } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }

    const task = await createTask({
      userId: Number(userId),
      title: String(title),
      task_time: task_time || null,
      category: category || null,
      task_date: task_date || null,
      end_date: end_date || null,
      important: Number(important) ? 1 : 0,
      description: description || null,
      isDaily: Number(isDaily) ? 1 : 0,
    });

    // createTask should return something like { id: insertId, ... }
    return res.json({ ok: true, id: task.id });
  } catch (err) {
    console.error("create task error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function all(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const tasks = await getTasksByUser(userId);
    return res.json(tasks);
  } catch (err) {
    console.error("all tasks error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function today(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    // allow ?date=YYYY-MM-DD override, otherwise Singapore "today"
    const dateStr = req.query.date || todaySG();

    const tasks = await getTodayTasks(userId, dateStr);
    return res.json(tasks);
  } catch (err) {
    console.error("today tasks error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function edit(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    if (!taskId) return res.status(400).json({ error: "taskId required" });

    const updated = await updateTask(taskId, req.body);
    if (!updated) return res.status(400).json({ error: "no fields to update" });

    return res.json(updated);
  } catch (err) {
    console.error("edit task error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function remove(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    if (!taskId) return res.status(400).json({ error: "taskId required" });

    await deleteTask(taskId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("remove task error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function complete(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    if (!taskId) return res.status(400).json({ error: "taskId required" });

    const task = await findTaskById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    const userId = task.userId; // (or use req.user.userId if you do JWT middleware)
    const method = req.body?.method || "manual";

    const log = await logCompletion({ taskId, userId, method });
    return res.json({ ok: true, log });
  } catch (err) {
    console.error("complete task error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function logs(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const rows = await getLogsByUser(userId);
    return res.json(rows);
  } catch (err) {
    console.error("logs error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function completedToday(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const dateStr = req.query.date || todaySG();
    const ids = await getCompletedTaskIdsToday(userId, dateStr);
    return res.json({ completedToday: ids });
  } catch (err) {
    console.error("completedToday error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function history(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const date = req.query.date || null; // YYYY-MM-DD or null for all
    const rows = await getHistory(userId, date);
    return res.json({ logs: rows });
  } catch (err) {
    console.error("history error:", err);
    return res.status(500).json({ error: "server error" });
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
