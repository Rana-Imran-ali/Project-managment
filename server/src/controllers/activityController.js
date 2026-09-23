const Activity = require("../models/Activity");
const Project = require("../models/Project");

// Get Project Activities
const getProjectActivities = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const activities = await Activity.find({
      project: projectId,
    })
      .populate("user", "name email")
      .populate("task", "title")
      .populate("project", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get Task Activities
const getTaskActivities = async (req, res) => {
  try {
    const { taskId } = req.params;

    const activities = await Activity.find({
      task: taskId,
    })
      .populate("user", "name email")
      .populate("task", "title")
      .populate("project", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get My Activities
const getMyActivities = async (req, res) => {
  try {
    const activities = await Activity.find({
      user: req.user._id,
    })
      .populate("project", "name")
      .populate("task", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  getProjectActivities,
  getTaskActivities,
  getMyActivities,
};