const express = require("express");

const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  createTaskValidator,
  updateTaskValidator,
} = require("../validators/taskValidator");

const validate = require("../middleware/validationMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("admin"),
  createTaskValidator,
  validate,
  createTask
);

router.get("/", protect, getTasks);

router.get("/:id", protect, getTask);

router.put(
  "/:id",
  protect,
  updateTaskValidator,
  validate,
  updateTask
);

router.delete("/:id", protect, authorize("admin"), deleteTask);

module.exports = router;