const Comment = require("../models/Comment");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

// ─── helpers ──────────────────────────────────────────────────────────────────

function broadcast(event, data, projectId, taskId) {
  try {
    const io = getIO();
    if (projectId) io.to(`project:${projectId}`).emit(event, data);
    if (taskId)    io.to(`task:${taskId}`).emit(event, data);
  } catch { /* no-op */ }
}

async function broadcastActivity(activity, projectId) {
  try {
    const populated = await Activity.findById(activity._id)
      .populate("user", "name email")
      .populate("task", "title")
      .populate("project", "name");
    getIO().to(`project:${projectId}`).emit("activity:new", populated);
  } catch { /* no-op */ }
}

// ─── Create Comment ───────────────────────────────────────────────────────────
const createComment = async (req, res) => {
  try {
    const { content, task } = req.body;

    const existingTask = await Task.findById(task);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const comment = await Comment.create({ content, task, user: req.user._id });

    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("task", "title");

    const projectId = existingTask.project;

    // ── Activity log ──────────────────────────────────────────────
    const newActivity = await Activity.create({
      user: req.user._id,
      project: projectId,
      task: existingTask._id,
      action: "comment-added",
      description: `Commented on task "${existingTask.title}"`,
    });
    broadcastActivity(newActivity, projectId);

    // ── Notification → task assignee (if someone else commented) ──
    if (
      existingTask.assignedTo &&
      existingTask.assignedTo.toString() !== req.user._id.toString()
    ) {
      try {
        const notif = await Notification.create({
          recipient: existingTask.assignedTo,
          sender: req.user._id,
          type: "comment-added",
          message: `${req.user.name} commented on "${existingTask.title}".`,
          project: projectId,
          task: existingTask._id,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("sender", "name email")
          .populate("task", "title")
          .populate("project", "name");
        getIO().to(`user:${existingTask.assignedTo}`).emit("notification:new", populatedNotif);
      } catch { /* no-op */ }
    }

    // ── Real-time: push comment to task room and project room ─────
    broadcast("comment:created", populatedComment, projectId, existingTask._id);

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Get Comments of a Task ───────────────────────────────────────────────────
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const comments = await Comment.find({ task: taskId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: comments.length, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Update Comment ───────────────────────────────────────────────────────────
const updateComment = async (req, res) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findOne({ _id: req.params.id, user: req.user._id });
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not authorized",
      });
    }

    if (content !== undefined) comment.content = content;
    await comment.save();

    const updatedComment = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("task", "title");

    const task = await Task.findById(comment.task);

    // ── Activity log ──────────────────────────────────────────────
    if (task) {
      const updatedActivity = await Activity.create({
        user: req.user._id,
        project: task.project,
        task: task._id,
        action: "comment-updated",
        description: `Updated a comment on task "${task.title}"`,
      });
      broadcastActivity(updatedActivity, task.project);
    }

    broadcast("comment:updated", updatedComment, task?.project, comment.task);

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Delete Comment ───────────────────────────────────────────────────────────
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, user: req.user._id });
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not authorized",
      });
    }

    const task = await Task.findById(comment.task);
    const commentId = comment._id;
    const taskId    = comment.task;

    await comment.deleteOne();

    // ── Activity log ──────────────────────────────────────────────
    if (task) {
      const deletedActivity = await Activity.create({
        user: req.user._id,
        project: task.project,
        task: task._id,
        action: "comment-deleted",
        description: `Deleted a comment on task "${task.title}"`,
      });
      broadcastActivity(deletedActivity, task.project);
    }

    broadcast("comment:deleted", { _id: commentId, task: taskId }, task?.project, taskId);

    res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = { createComment, getTaskComments, updateComment, deleteComment };