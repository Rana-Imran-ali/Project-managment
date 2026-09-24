const express = require("express");

const router = express.Router();

const {
  uploadAttachment,
  getTaskAttachments,
  deleteAttachment,
} = require("../controllers/attachmentController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post(
  "/task/:taskId",
  protect,
  upload.single("file"),
  uploadAttachment
);

router.get(
  "/task/:taskId",
  protect,
  getTaskAttachments
);

router.delete(
  "/:id",
  protect,
  deleteAttachment
);

module.exports = router;