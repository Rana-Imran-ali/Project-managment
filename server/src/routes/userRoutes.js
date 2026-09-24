const express = require("express");
const { searchUsers } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/users/search?q=... — Admin only: search users by name or email
router.get("/search", protect, authorize("admin"), searchUsers);

module.exports = router;
