const express = require("express");

const {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

const { protect } = require("../middleware/authMiddleware");
const {
  createCommentValidator,
  updateCommentValidator,
} = require("../validators/commentValidator");
const validate = require("../middleware/validationMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  createCommentValidator,
  validate,
  createComment
);

router.get("/task/:taskId", protect, getTaskComments);

router.put(
  "/:id",
  protect,
  updateCommentValidator,
  validate,
  updateComment
);

router.delete("/:id", protect, deleteComment);

module.exports = router;