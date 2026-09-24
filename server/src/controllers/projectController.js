const mongoose = require("mongoose");
const Project = require("../models/Project");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Create a new project
const createProject = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied: Only admins can create projects",
      });
    }

    const { name, description, members, status, deadline } = req.body || {};

    const owner = req.user._id;

    if (!name) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    if (members && Array.isArray(members)) {
      const hasInvalidMember = members.some(
        (m) => !mongoose.Types.ObjectId.isValid(m)
      );
      if (hasInvalidMember) {
        return res.status(400).json({
          message: "One or more member IDs are invalid",
        });
      }
    }

    const project = await Project.create({
      name,
      description,
      owner,
      members: members || [],
      status,
      deadline,
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Validation error",
        error: error.message,
      });
    }
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all projects (Admins see all; Members see projects they are part of)
const getProjects = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { $or: [{ owner: req.user._id }, { members: req.user._id }] };

    const projects = await Project.find(filter)
      .populate("owner", "name email role")
      .populate("members", "name email role");

    res.status(200).json({
      projects,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single project
const getProjectById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const filter = { _id: req.params.id };
    if (req.user.role !== "admin") {
      filter.$or = [{ owner: req.user._id }, { members: req.user._id }];
    }

    const project = await Project.findOne(filter)
      .populate("owner", "name email role")
      .populate("members", "name email role");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      project,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied: Only admins can edit projects",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const updates = req.body || {};

    if (updates.owner && !mongoose.Types.ObjectId.isValid(updates.owner)) {
      return res.status(400).json({
        message: "Invalid owner ID format",
      });
    }

    if (updates.members && Array.isArray(updates.members)) {
      const hasInvalidMember = updates.members.some(
        (m) => !mongoose.Types.ObjectId.isValid(m)
      );
      if (hasInvalidMember) {
        return res.status(400).json({
          message: "One or more member IDs are invalid",
        });
      }
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Validation error",
        error: error.message,
      });
    }
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied: Only admins can delete projects",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── Add Member to Project (Admin only) ───────────────────────────────────────
const addMember = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied: Only admins can manage project members",
      });
    }

    const { id: projectId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Verify the user exists
    const userToAdd = await User.findById(userId).select("-password");
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if already a member
    const alreadyMember = project.members.some(
      (m) => m.toString() === userId
    );
    if (alreadyMember) {
      return res.status(409).json({ message: "User is already a member of this project" });
    }

    // Check if they are the owner
    if (project.owner.toString() === userId) {
      return res.status(409).json({ message: "User is already the project owner" });
    }

    // Add member
    project.members.push(userId);
    await project.save();

    // Send instant notification to the added employee
    await Notification.create({
      recipient: userId,
      sender: req.user._id,
      type: "project-added",
      message: `You have been added to the project "${project.name}" by ${req.user.name}.`,
      project: project._id,
    });

    // Return updated project with populated fields
    const updatedProject = await Project.findById(projectId)
      .populate("owner", "name email role")
      .populate("members", "name email role");

    res.status(200).json({
      message: `${userToAdd.name} has been added to the project`,
      project: updatedProject,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Remove Member from Project (Admin only) ──────────────────────────────────
const removeMember = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied: Only admins can manage project members",
      });
    }

    const { id: projectId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const memberIndex = project.members.findIndex(
      (m) => m.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "User is not a member of this project" });
    }

    // Remove member
    project.members.splice(memberIndex, 1);
    await project.save();

    // Return updated project with populated fields
    const updatedProject = await Project.findById(projectId)
      .populate("owner", "name email role")
      .populate("members", "name email role");

    res.status(200).json({
      message: "Member removed from project",
      project: updatedProject,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};