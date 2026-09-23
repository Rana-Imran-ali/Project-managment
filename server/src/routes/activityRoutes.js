const express = require("express");

const {
  getProjectActivities,
  getTaskActivities,
  getMyActivities,
} = require("../controllers/activityController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my", protect, getMyActivities);

router.get(
  "/project/:projectId",
  protect,
  getProjectActivities
);

router.get(
  "/task/:taskId",
  protect,
  getTaskActivities
);

module.exports = router;