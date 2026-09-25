const Task = require("../models/Task");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Broadcast a task-related event to the project room and optionally the task room.
 * Silently swallows socket errors so HTTP responses always succeed.
 */
function broadcast(event, data, projectId, taskId) {
  try {
    const io = getIO();
    if (projectId) io.to(`project:${projectId}`).emit(event, data);
    if (taskId)    io.to(`task:${taskId}`).emit(event, data);
  } catch { /* socket not yet ready — no-op */ }
}

/** Populate and broadcast a newly created Activity to the project room. */
async function broadcastActivity(activity, projectId) {
  try {
    const Activity = require("../models/Activity");
    const populated = await Activity.findById(activity._id)
      .populate("user", "name email")
      .populate("task", "title")
      .populate("project", "name");
    const io = getIO();
    io.to(`project:${projectId}`).emit("activity:new", populated);
  } catch { /* no-op */ }
}

/** Create, populate, and emit a real-time Notification to the recipient's private room. */
async function sendNotification({ recipient, sender, type, message, project, task }) {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      project,
      task,
    });
    const populated = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("task", "title")
      .populate("project", "name");
    getIO().to(`user:${recipient}`).emit("notification:new", populated);
    return populated;
  } catch { /* no-op */ }
}

// ─── Create Task ──────────────────────────────────────────────────────────────
const createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, status, priority, dueDate } = req.body;

    // Check project
    const existingProject = await Project.findById(project);
    if (!existingProject) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Only admin or project owner can create tasks
    if (
      req.user.role !== "admin" &&
      existingProject.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only admins can create and assign tasks",
      });
    }

    const task = await Task.create({
      title, description, project,
      assignedTo: assignedTo || null,
      status, priority, dueDate,
      createdBy: req.user._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    // ── Activity log ──────────────────────────────────────────────
    const createdActivity = await Activity.create({
      user: req.user._id,
      project: project,
      task: task._id,
      action: "task-created",
      description: `Created task "${title}"`,
    });
    broadcastActivity(createdActivity, project);


    // ── Notification → assignee ───────────────────────────────────
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      await sendNotification({
        recipient: assignedTo,
        sender: req.user._id,
        type: "task-assigned",
        message: `You have been assigned the task "${title}" by ${req.user.name}.`,
        project: project,
        task: task._id,
      });
    }

    // ── Real-time board update → all project members ──────────────
    broadcast("task:created", populatedTask, project, null);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Get All Tasks ────────────────────────────────────────────────────────────
const getTasks = async (req, res) => {
  try {
    const { project, status, priority } = req.query;
    const filter = {};

    if (req.user.role === "admin") {
      if (project) filter.project = project;
    } else {
      if (project) {
        filter.project = project;
      } else {
        filter.assignedTo = req.user._id;
      }
    }

    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Get Single Task ──────────────────────────────────────────────────────────
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("project", "name")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Update Task ──────────────────────────────────────────────────────────────
const updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate } = req.body;

    let task;
    if (req.user.role === "admin") {
      task = await Task.findById(req.params.id);
    } else {
      task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: req.user.role === "admin" ? "Task not found" : "Task not found or not assigned to you",
      });
    }

    // Remember previous values for activity descriptions
    const prevStatus   = task.status;
    const prevAssignee = task.assignedTo;

    if (req.user.role !== "admin") {
      // Employees can only update task status
      if (
        title !== undefined || description !== undefined ||
        assignedTo !== undefined || priority !== undefined || dueDate !== undefined
      ) {
        return res.status(403).json({
          success: false,
          message: "Employees can only update task status (in-progress, completed, etc.)",
        });
      }
      if (status !== undefined) task.status = status;
    } else {
      // Admins can update all fields
      if (title       !== undefined) task.title       = title;
      if (description !== undefined) task.description = description;
      if (assignedTo  !== undefined) task.assignedTo  = assignedTo || null;
      if (status      !== undefined) task.status      = status;
      if (priority    !== undefined) task.priority    = priority;
      if (dueDate     !== undefined) task.dueDate     = dueDate || null;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    const projectId = updatedTask.project?._id || updatedTask.project;

    // ── Activity log ──────────────────────────────────────────────
    let activityAction = "task-updated";
    let activityDesc   = `Updated task "${updatedTask.title}"`;

    if (status !== undefined && status !== prevStatus) {
      if (status === "completed") {
        activityAction = "task-completed";
        activityDesc   = `Completed task "${updatedTask.title}"`;
      } else {
        activityAction = "task-updated";
        activityDesc   = `Changed status of "${updatedTask.title}" to ${status}`;
      }
    }

    const updatedActivity = await Activity.create({
      user: req.user._id,
      project: projectId,
      task: updatedTask._id,
      action: activityAction,
      description: activityDesc,
    });
    broadcastActivity(updatedActivity, projectId);

    // ── Notification → new assignee (admin re-assigned the task) ──
    if (
      req.user.role === "admin" &&
      assignedTo &&
      assignedTo.toString() !== (prevAssignee?.toString() || "") &&
      assignedTo.toString() !== req.user._id.toString()
    ) {
      await sendNotification({
        recipient: assignedTo,
        sender: req.user._id,
        type: "task-assigned",
        message: `You have been assigned the task "${updatedTask.title}" by ${req.user.name}.`,
        project: projectId,
        task: updatedTask._id,
      });
    }

    // ── Notification → task creator on completion ──────────────────
    if (
      status === "completed" &&
      updatedTask.createdBy &&
      updatedTask.createdBy._id.toString() !== req.user._id.toString()
    ) {
      await sendNotification({
        recipient: updatedTask.createdBy._id,
        sender: req.user._id,
        type: "task-completed",
        message: `${req.user.name} completed task "${updatedTask.title}".`,
        project: projectId,
        task: updatedTask._id,
      });
    }

    // ── Real-time board update → project room + task room ─────────
    broadcast("task:updated", updatedTask, projectId, updatedTask._id);

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── Delete Task ──────────────────────────────────────────────────────────────
const deleteTask = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only admins can delete tasks",
      });
    }

    const task = await Task.findById(req.params.id)
      .populate("project", "name");

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const projectId = task.project?._id || task.project;
    const taskId    = task._id;
    const taskTitle = task.title;

    await task.deleteOne();

    // ── Activity log ──────────────────────────────────────────────
    const deletedActivity = await Activity.create({
      user: req.user._id,
      project: projectId,
      task: taskId,
      action: "task-deleted",
      description: `Deleted task "${taskTitle}"`,
    });
    broadcastActivity(deletedActivity, projectId);

    // ── Real-time board update → project room ─────────────────────
    broadcast("task:deleted", { _id: taskId, project: projectId }, projectId, null);

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = { createTask, getTasks, getTask, updateTask, deleteTask };