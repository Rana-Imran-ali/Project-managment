const express = require("express");

const {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getNotifications);

router.get("/unread", protect, getUnreadNotifications);

router.put("/:id/read", protect, markAsRead);

router.put("/read-all", protect, markAllAsRead);

router.delete("/:id", protect, deleteNotification);

module.exports = router;