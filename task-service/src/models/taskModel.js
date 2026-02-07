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
  task_time = null,
  category = null,
  task_date = null,
  isDaily = 1,
  important = 0,
}) {
  const [result] = await pool.execute(
  `INSERT INTO tasks (userId, title, task_date, task_time, category, important, isDaily)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [userId, title, task_date || null, task_time || null, category || null, important ? 1 : 0, isDaily ? 1 : 0]
);


  const [rows] = await pool.execute(`SELECT * FROM tasks WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
}




async function getTasksByUser(userId) {
  const [rows] = await pool.execute(`SELECT * FROM tasks WHERE userId = ?`, [
    userId,
  ]);
  return rows;
}

async function getTodayTasks(userId, dateStr /* YYYY-MM-DD */) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM tasks
     WHERE userId = ?
       AND (
         isDaily = 1
         OR task_date = ?
       )
     ORDER BY task_time IS NULL, task_time`,
    [userId, dateStr]
  );
  return rows;
}


async function findTaskById(taskId) {
  const [rows] = await pool.execute(`SELECT * FROM tasks WHERE id = ?`, [
    taskId,
  ]);
  return rows[0];
}

async function updateTask(taskId, fields) {
  const allowed = ["title", "task_date", "task_time", "category", "isDaily", "important"];
  const sets = [];
  const vals = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(fields[key]);
    }
  }

  if (sets.length === 0) return null;

  vals.push(taskId);
  await pool.execute(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, vals);
  return findTaskById(taskId);
}

async function deleteTask(taskId) {
  await pool.execute(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  return true;
}

async function logCompletion({ taskId, userId, method = "nfc" }) {
  const [result] = await pool.execute(
    `INSERT INTO task_logs (taskId, userId, method) VALUES (?, ?, ?)`,
    [taskId, userId, method]
  );
  const [rows] = await pool.execute(`SELECT * FROM task_logs WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
}

async function getLogsByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM task_logs WHERE userId = ? ORDER BY completed_at DESC`,
    [userId]
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
};
