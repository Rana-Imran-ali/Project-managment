const fs = require("fs");
const Attachment = require("../models/Attachment");
const Task = require("../models/Task");
const { getIO } = require("../socket");

const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file",
      });
    }

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const attachment = await Attachment.create({
      task: task._id,
      uploadedBy: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    const populatedAttachment = await Attachment.findById(
      attachment._id
    ).populate("uploadedBy", "name email");

    // Real-time broadcast to task room
    try {
      getIO().to(`task:${task._id}`).emit("attachment:created", populatedAttachment);
    } catch { /* no-op */ }

    res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      attachment: populatedAttachment,
    });
  } catch (error) {
    next(error);
  }
};

const getTaskAttachments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const attachments = await Attachment.find({
      task: req.params.taskId,
    })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      attachments,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await Attachment.findById(req.params.id);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Check authorization: uploader or admin can delete
    const isOwner = attachment.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this attachment",
      });
    }

    // Remove file from disk if it exists
    if (attachment.path && fs.existsSync(attachment.path)) {
      try {
        fs.unlinkSync(attachment.path);
      } catch (err) {
        console.error("Failed to delete file from disk:", err);
      }
    }

    const taskId = attachment.task;
    await attachment.deleteOne();

    // Real-time broadcast to task room
    try {
      getIO().to(`task:${taskId}`).emit("attachment:deleted", attachment._id.toString());
    } catch { /* no-op */ }

    res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAttachment,
  getTaskAttachments,
  deleteAttachment,
};