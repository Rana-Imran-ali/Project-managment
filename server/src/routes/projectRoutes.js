const express = require("express");

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createProjectValidator,
  updateProjectValidator,
} = require("../validators/projectValidator");
const validate = require("../middleware/validationMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("admin"),
  createProjectValidator,
  validate,
  createProject
);

router.get("/", protect, getProjects);

router.get("/:id", protect, getProjectById);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateProjectValidator,
  validate,
  updateProject
);

router.delete("/:id", protect, authorize("admin"), deleteProject);

module.exports = router;