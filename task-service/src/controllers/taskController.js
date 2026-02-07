const {
  createTask,
  getTasksByUser,
  getTodayTasks,
  updateTask,
  deleteTask,
  findTaskById,
  logCompletion,
  getLogsByUser,
} = require("../models/taskModel");

async function create(req, res) {
  try {
    const { userId, title, task_time, category, task_date, isDaily, important } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }

    const task = await createTask({
      userId,
      title,
      task_time,
      category,
      task_date,
      isDaily,
      important,
    });

    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}





async function today(req, res) {
  try {
    const userId = Number(req.params.userId);
    const dateStr = req.query.date || todaySG(); // allow frontend override
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

    // If your token has userId, you can use req.user.userId
    const userId = task.userId;
    const method = req.body?.method || "nfc";

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

async function todaySG() {
  // YYYY-MM-DD in Asia/Singapore
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}


module.exports = { create, all, today, edit, remove, complete, logs };