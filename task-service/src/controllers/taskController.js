// controllers/taskController.js

const {
  createTask,
  getTasksByUser,
  getTodayTasks,
  updateTask,
  deleteTask,
  findTaskById,
  logCompletionOncePerDay,
  getLogsByUser,
  getCompletedTaskIdsToday,
  getHistory,
} = require("../models/taskModel");

function todaySG() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

/**
 * ✅ Permission rules:
 * - caregiver can manage ANY user's tasks (PWID)
 * - normal user can ONLY manage their own tasks
 */
function canActOn(reqUser, targetUserId) {
  const me = Number(reqUser?.userId);
  const target = Number(targetUserId);

  if (!Number.isFinite(target) || target <= 0) return false;

  if (reqUser?.userType === "caregiver") return true;

  return Number.isFinite(me) && me === target;
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

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
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

    return res.json(task);
  } catch (err) {
    console.error("create task error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function all(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

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

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

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

    const task = await findTaskById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    // ✅ permission check based on owner
    if (!canActOn(req.user, task.userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

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

    const task = await findTaskById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    // ✅ permission check based on owner
    if (!canActOn(req.user, task.userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

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

    // ✅ permission check: must have access to this task owner
    if (!canActOn(req.user, task.userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const userId = task.userId;
    const method = req.body?.method || "manual";

    // ✅ use selected date if provided
    const dateStr = req.query.date || todaySG();

    const log = await logCompletionOncePerDay({ taskId, userId, method, dateStr });

    if (log?.alreadyCompletedToday) {
      return res.json({ ok: true, alreadyCompletedToday: true, date: dateStr });
    }

    return res.json({ ok: true, log, date: dateStr });
  } catch (err) {
    console.error("complete task error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function logs(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

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

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const dateStr = req.query.date || todaySG();
    const ids = await getCompletedTaskIdsToday(userId, dateStr);
    return res.json({ completedToday: ids, date: dateStr });
  } catch (err) {
    console.error("completedToday error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function history(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const date = req.query.date || null;
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
