const express = require("express");
const router = express.Router();
const verifyJWT = require("../middlewares/verifyJWT");
const ctrl = require("../controllers/taskController");

// protect all task routes
router.use(verifyJWT);

// --- TASKS (specific first) ---
router.get("/tasks/today/:userId", ctrl.today);
router.get("/tasks/completed/today/:userId", ctrl.completedToday);

// --- TASKS (generic last) ---
router.get("/tasks/:userId", ctrl.all);

router.post("/tasks", ctrl.create);
router.patch("/tasks/:taskId", ctrl.edit);
router.delete("/tasks/:taskId", ctrl.remove);

// ✅ needed for progress + chart
router.post("/tasks/:taskId/complete", ctrl.complete);



module.exports = router;
