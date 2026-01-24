const {
  createTask,
  getTodayTasks,
  updateTask,
  deleteTask,
  findTaskById,
  logCompletion,
  getLogsByUser,
} = require("../models/taskModel");

async function create(req, res) {
  try {
    const { userId, title, task_time, category } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }
    const task = await createTask({ userId, title, task_time, category });
    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

async function today(req, res) {
  try {
    const userId = Number(req.params.userId);
    const tasks = await getTodayTasks(userId);
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

module.exports = { create, today, edit, remove, complete, logs };
