const db = require("../db");

// helper: yyyy-mm-dd local
function toYMD(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function create(req, res) {
  try {
    const {
      userId,
      title,
      category = null,
      task_date = null,
      task_time = null,
      important = 0,
      isDaily = 0,
    } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }

    const [result] = await db.query(
      `
      INSERT INTO tasks (userId, title, category, task_date, task_time, important, isDaily)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(userId),
        String(title),
        category,
        task_date ? task_date : null,
        task_time ? task_time : null,
        Number(important) ? 1 : 0,
        Number(isDaily) ? 1 : 0,
      ]
    );

    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error("create task error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
}

async function all(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [rows] = await db.query(
      `
      SELECT id, userId, title, category, task_date, task_time, important, isDaily, created_at
      FROM tasks
      WHERE userId = ?
      ORDER BY COALESCE(task_date, CURRENT_DATE()) ASC, id ASC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("all tasks error:", err);
    res.status(500).json({ error: "Failed to get tasks" });
  }
}

// tasks due today = daily + tasks whose task_date = today
async function today(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [rows] = await db.query(
      `
      SELECT id, userId, title, category, task_date, task_time, important, isDaily, created_at
      FROM tasks
      WHERE userId = ?
        AND (isDaily = 1 OR task_date = CURRENT_DATE())
      ORDER BY isDaily DESC, id ASC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("today tasks error:", err);
    res.status(500).json({ error: "Failed to get today tasks" });
  }
}

async function edit(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    if (!taskId) return res.status(400).json({ error: "taskId required" });

    const {
      title,
      category,
      task_date,
      task_time,
      important,
      isDaily,
    } = req.body;

    // update only fields provided
    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(String(title));
    }
    if (category !== undefined) {
      fields.push("category = ?");
      values.push(category);
    }
    if (task_date !== undefined) {
      fields.push("task_date = ?");
      values.push(task_date || null);
    }
    if (task_time !== undefined) {
      fields.push("task_time = ?");
      values.push(task_time || null);
    }
    if (important !== undefined) {
      fields.push("important = ?");
      values.push(Number(important) ? 1 : 0);
    }
    if (isDaily !== undefined) {
      fields.push("isDaily = ?");
      values.push(Number(isDaily) ? 1 : 0);
    }

    if (!fields.length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(taskId);

    await db.query(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, values);

    res.json({ ok: true });
  } catch (err) {
    console.error("edit task error:", err);
    res.status(500).json({ error: "Failed to edit task" });
  }
}

async function remove(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    const userId = Number(req.query.userId); // your frontend sends ?userId=...

    if (!taskId) return res.status(400).json({ error: "taskId required" });
    if (!userId) return res.status(400).json({ error: "userId required" });

    // safety: only delete user's task
    const [result] = await db.query(
      `DELETE FROM tasks WHERE id = ? AND userId = ?`,
      [taskId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found for this user" });
    }

    // optional cleanup logs
    await db.query(`DELETE FROM task_logs WHERE taskId = ? AND userId = ?`, [taskId, userId]);

    res.json({ ok: true });
  } catch (err) {
    console.error("remove task error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
}

// ✅ IMPORTANT: this creates a log row = "completed"
async function complete(req, res) {
  try {
    const taskId = Number(req.params.taskId);
    const userId = Number(req.query.userId || req.body.userId);

    if (!taskId || !userId) {
      return res.status(400).json({ error: "taskId and userId required" });
    }

    // ensure task belongs to user
    const [[task]] = await db.query(`SELECT id FROM tasks WHERE id = ? AND userId = ?`, [taskId, userId]);
    if (!task) return res.status(404).json({ error: "Task not found for this user" });

    await db.query(
      `INSERT INTO task_logs (taskId, userId, method) VALUES (?, ?, 'manual')`,
      [taskId, userId]
    );

    res.json({ ok: true, taskId, userId });
  } catch (err) {
    console.error("complete task error:", err);
    res.status(500).json({ error: "Failed to complete task" });
  }
}

async function logs(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [rows] = await db.query(
      `
      SELECT id, taskId, userId, method, completed_at
      FROM task_logs
      WHERE userId = ?
      ORDER BY completed_at DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("logs error:", err);
    res.status(500).json({ error: "Failed to get logs" });
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
};
