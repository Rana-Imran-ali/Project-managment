const Comment = require("../models/Comment");
const Task = require("../models/Task");

// Create Comment
const createComment = async (req, res) => {
  try {
    const { content, task } = req.body;

    // Check task
    const existingTask = await Task.findById(task);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comment = await Comment.create({
      content,
      task,
      user: req.user._id,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("task", "title");

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get Comments of a Task
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check task
    const existingTask = await Task.findById(taskId);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comments = await Comment.find({
      task: taskId,
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Update Comment
const updateComment = async (req, res) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not authorized",
      });
    }

    if (content !== undefined) {
      comment.content = content;
    }

    await comment.save();

    const updatedComment = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("task", "title");

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Delete Comment
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not authorized",
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
};