const express = require("express");
const router = express.Router();
const verifyJWT = require("../middlewares/verifyJWT");
const ctrl = require("../controllers/taskController");

// protect all task routes
router.use(verifyJWT);

router.post("/tasks", ctrl.create);
router.get("/tasks/today/:userId", ctrl.today);
router.patch("/tasks/:taskId", ctrl.edit);
router.delete("/tasks/:taskId", ctrl.remove);
router.post("/tasks/:taskId/complete", ctrl.complete);
router.get("/logs/:userId", ctrl.logs);

module.exports = router;
