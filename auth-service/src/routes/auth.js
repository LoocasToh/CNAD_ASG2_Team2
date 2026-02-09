// routes/auth.js
const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  protectedTest,
  authMiddleware,
  listPwids,
} = require("../controllers/authController");

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected route
router.get("/me", authMiddleware, protectedTest);

// ✅ NEW: caregiver-only list of PWIDs (users)
router.get("/pwids", authMiddleware, listPwids);

module.exports = router;
