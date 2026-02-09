const express = require("express");
const router = express.Router();
const verifyJWT = require("../middlewares/verifyJWT");
const db = require("../db");

// protect analytics too
router.use(verifyJWT);

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month: 1-12
}

// GET /analytics/progress/today?userId=2
router.get("/progress/today", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [[expectedRow]] = await db.query(
      `
      SELECT COUNT(*) AS expected
      FROM tasks
      WHERE userId = ?
        AND (isDaily = 1 OR task_date = CURRENT_DATE())
      `,
      [userId]
    );

    const [[completedRow]] = await db.query(
      `
      SELECT COUNT(DISTINCT taskId) AS completed
      FROM task_logs
      WHERE userId = ?
        AND DATE(completed_at) = CURRENT_DATE()
      `,
      [userId]
    );

    const expected = Number(expectedRow.expected || 0);
    const completed = Number(completedRow.completed || 0);
    const percent = expected === 0 ? 0 : Math.round((completed / expected) * 100);

    res.json({ userId, expected, completed, percent });
  } catch (err) {
    console.error("progress today error:", err);
    res.status(500).json({ error: "Failed to generate today progress" });
  }
});

// GET /analytics/completion/daily?userId=2&year=2026&month=2
router.get("/completion/daily", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const year = Number(req.query.year);
    const month = Number(req.query.month); // 1-12

    if (!userId || !year || !month) {
      return res.status(400).json({ error: "userId, year, month required" });
    }

    const totalDays = daysInMonth(year, month);
    const results = [];

    for (let d = 1; d <= totalDays; d++) {
      const date = `${year}-${pad2(month)}-${pad2(d)}`;

      const [[expectedRow]] = await db.query(
        `
        SELECT COUNT(*) AS expected
        FROM tasks
        WHERE userId = ?
          AND (isDaily = 1 OR task_date = ?)
        `,
        [userId, date]
      );

      const [[completedRow]] = await db.query(
        `
        SELECT COUNT(DISTINCT taskId) AS completed
        FROM task_logs
        WHERE userId = ?
          AND DATE(completed_at) = ?
        `,
        [userId, date]
      );

      const expected = Number(expectedRow.expected || 0);
      const completed = Number(completedRow.completed || 0);
      const rate = expected === 0 ? 0 : Math.round((completed / expected) * 100);

      results.push({ date, expected, completed, rate });
    }

    res.json(results);
  } catch (err) {
    console.error("daily completion error:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

module.exports = router;
