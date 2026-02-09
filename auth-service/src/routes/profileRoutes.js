const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../controllers/authController");
const ctrl = require("../controllers/profileController");

// Must be logged in
router.use(authMiddleware);

// Profile
router.get("/me/profile", ctrl.getMyProfile);
router.patch("/me/profile", ctrl.patchMyProfile);

// Contacts
router.get("/me/contacts", ctrl.getMyContacts);
router.post("/me/contacts", ctrl.addMyContact);
router.patch("/me/contacts/:id", ctrl.patchMyContact);
router.delete("/me/contacts/:id", ctrl.deleteMyContact);

// Health
router.get("/me/health", ctrl.getMyHealth);
router.patch("/me/health", ctrl.patchMyHealth);

module.exports = router;
