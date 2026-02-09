const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "task-db",
  user: process.env.MYSQL_USER || "taskuser",
  password: process.env.MYSQL_PASSWORD || "taskpass",
  database: process.env.MYSQL_DB || "taskdb",
  waitForConnections: true,
  connectionLimit: 10,
});

async function createTask({
  userId,
  title,
  task_time,
  category,
  task_date = null,
  end_date = null,
  important = 0,
  description = null,
  isDaily = 1,
}) {
  const [result] = await pool.execute(
    `INSERT INTO tasks
      (userId, title, task_time, category, task_date, end_date, important, description, isDaily)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(userId),
      title,
      task_time || null,
      category || null,
      task_date || null,     // if null your DB default CURRENT_DATE will apply (if you set it)
      end_date || null,
      important ? 1 : 0,
      description || null,
      isDaily ? 1 : 0,
    ]
  );

  const [rows] = await pool.execute(`SELECT * FROM tasks WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function getTasksByUser(userId) {
  const [rows] = await pool.execute(`SELECT * FROM tasks WHERE userId = ?`, [Number(userId)]);
  return rows;
}

// ✅ dateStr is "YYYY-MM-DD" (Asia/Singapore from controller)
async function getTodayTasks(userId, dateStr) {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM tasks
    WHERE userId = ?
      AND (
        -- daily tasks: show every day from task_date until end_date (if any)
        (isDaily = 1
          AND (task_date IS NULL OR task_date <= ?)
          AND (end_date IS NULL OR end_date >= ?)
        )
        OR
        -- one-off tasks: show only on that date
        (isDaily = 0 AND task_date = ?)
      )
    ORDER BY task_time IS NULL, task_time
    `,
    [Number(userId), dateStr, dateStr, dateStr]
  );
  return rows;
}

async function findTaskById(taskId) {
  const [rows] = await pool.execute(`SELECT * FROM tasks WHERE id = ?`, [Number(taskId)]);
  return rows[0];
}

async function updateTask(taskId, fields) {
  const allowed = ["title", "task_time", "category", "task_date", "end_date", "important", "description", "isDaily"];
  const sets = [];
  const vals = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      // normalize boolean-ish fields
      if (key === "important" || key === "isDaily") {
        sets.push(`${key} = ?`);
        vals.push(fields[key] ? 1 : 0);
      } else {
        sets.push(`${key} = ?`);
        vals.push(fields[key]);
      }
    }
  }

  if (sets.length === 0) return null;

  vals.push(Number(taskId));
  await pool.execute(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, vals);
  return findTaskById(taskId);
}

async function deleteTask(taskId) {
  await pool.execute(`DELETE FROM tasks WHERE id = ?`, [Number(taskId)]);
  return true;
}

async function logCompletion({ taskId, userId, method = "manual" }) {
  const [result] = await pool.execute(
    `INSERT INTO task_logs (taskId, userId, method) VALUES (?, ?, ?)`,
    [Number(taskId), Number(userId), method]
  );

  const [rows] = await pool.execute(`SELECT * FROM task_logs WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function getLogsByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM task_logs WHERE userId = ? ORDER BY completed_at DESC`,
    [Number(userId)]
  );
  return rows;
}

async function getCompletedTaskIdsToday(userId, dateStr) {
  const [rows] = await pool.execute(
    `
    SELECT DISTINCT taskId
    FROM task_logs
    WHERE userId = ?
      AND DATE(completed_at) = ?
    `,
    [Number(userId), dateStr]
  );
  return rows.map((r) => Number(r.taskId));
}

async function getHistory(userId, dateStr = null) {
  const params = [Number(userId)];
  let where = "WHERE l.userId = ?";

  if (dateStr) {
    where += " AND DATE(l.completed_at) = ?";
    params.push(dateStr);
  }

  const [rows] = await pool.execute(
    `
    SELECT
      l.id AS logId,
      l.taskId,
      l.completed_at,
      l.method,
      t.title,
      t.category,
      t.task_time,
      t.task_date,
      t.end_date
    FROM task_logs l
    JOIN tasks t ON t.id = l.taskId
    ${where}
    ORDER BY l.completed_at DESC
    `,
    params
  );

  return rows;
}

module.exports = {
  createTask,
  getTasksByUser,
  getTodayTasks,
  findTaskById,
  updateTask,
  deleteTask,
  logCompletion,
  getLogsByUser,
  getCompletedTaskIdsToday,
  getHistory,
};
