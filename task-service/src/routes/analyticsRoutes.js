// routes/analyticsRoutes.js

const express = require("express");
const router = express.Router();
const verifyJWT = require("../middlewares/verifyJWT");
const db = require("../db");

router.use(verifyJWT);

/**
 * ✅ Permission rules:
 * - caregiver can view analytics for ANY user
 * - normal user can ONLY view their own analytics
 */
function canActOn(reqUser, targetUserId) {
  const me = Number(reqUser?.userId);
  const target = Number(targetUserId);

  if (!Number.isFinite(target) || target <= 0) return false;

  if (reqUser?.userType === "caregiver") return true;

  return Number.isFinite(me) && me === target;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month: 1-12
}

function todaySG() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

// expected tasks on a date (matches taskModel.getTodayTasks())
const EXPECTED_SQL = `
  SELECT COUNT(*) AS expected
  FROM tasks
  WHERE userId = ?
    AND (
      (isDaily = 1
        AND (task_date IS NULL OR task_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      )
      OR
      (isDaily = 0 AND task_date = ?)
    )
`;

const COMPLETED_SQL = `
  SELECT COUNT(DISTINCT taskId) AS completed
  FROM task_logs
  WHERE userId = ?
    AND DATE(completed_at) = ?
`;

// ✅ GET /analytics/progress/day?userId=2&date=2026-02-12
router.get("/progress/day", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const dateStr = req.query.date;

    if (!userId || !dateStr) {
      return res.status(400).json({ error: "userId and date required" });
    }

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const [[expectedRow]] = await db.query(EXPECTED_SQL, [userId, dateStr, dateStr, dateStr]);
    const [[completedRow]] = await db.query(COMPLETED_SQL, [userId, dateStr]);

    const expected = Number(expectedRow?.expected || 0);
    const completed = Number(completedRow?.completed || 0);

    const percent =
      expected === 0 ? 0 : Math.min(100, Math.round((completed / expected) * 100));

    return res.json({ userId, date: dateStr, expected, completed, percent });
  } catch (err) {
    console.error("progress day error:", err);
    return res.status(500).json({ error: "Failed to generate progress" });
  }
});

// optional: keep today endpoint
router.get("/progress/today", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const dateStr = todaySG();

    const [[expectedRow]] = await db.query(EXPECTED_SQL, [userId, dateStr, dateStr, dateStr]);
    const [[completedRow]] = await db.query(COMPLETED_SQL, [userId, dateStr]);

    const expected = Number(expectedRow?.expected || 0);
    const completed = Number(completedRow?.completed || 0);

    const percent =
      expected === 0 ? 0 : Math.min(100, Math.round((completed / expected) * 100));

    return res.json({ userId, date: dateStr, expected, completed, percent });
  } catch (err) {
    console.error("progress today error:", err);
    return res.status(500).json({ error: "Failed to generate today progress" });
  }
});

// ✅ GET /analytics/completion/daily?userId=2&year=2026&month=2
router.get("/completion/daily", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const year = Number(req.query.year);
    const month = Number(req.query.month); // 1-12

    if (!userId || !year || !month) {
      return res.status(400).json({ error: "userId, year, month required" });
    }

    // ✅ permission check
    if (!canActOn(req.user, userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const totalDays = daysInMonth(year, month);
    const results = [];

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;

      const [[expectedRow]] = await db.query(EXPECTED_SQL, [userId, dateStr, dateStr, dateStr]);
      const [[completedRow]] = await db.query(COMPLETED_SQL, [userId, dateStr]);

      const expected = Number(expectedRow?.expected || 0);
      const completed = Number(completedRow?.completed || 0);

      const rate =
        expected === 0 ? 0 : Math.min(100, Math.round((completed / expected) * 100));

      results.push({ date: dateStr, expected, completed, rate });
    }

    return res.json(results);
  } catch (err) {
    console.error("daily completion error:", err);
    return res.status(500).json({ error: "Failed to generate analytics" });
  }
});

module.exports = router;
