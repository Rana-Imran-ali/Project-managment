const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Activity = require("../models/Activity");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Project.deleteMany();
    await Task.deleteMany();
    await Comment.deleteMany();
    await Notification.deleteMany();
    await Activity.deleteMany();

    console.log("Old data cleared");

    // -------------------------
    // USERS
    // -------------------------

    const defaultPassword = await bcrypt.hash("123456", 10);

    const users = await User.create([
      {
        name: "Ali (Admin)",
        email: "ranaimranali2210@gmail.com",
        password: await bcrypt.hash("ranaimranali", 10),
        role: "admin",
      },
      {
        name: "Ahmed",
        email: "ahmed@example.com",
        password: defaultPassword,
      },
      {
        name: "Sara",
        email: "sara@example.com",
        password: defaultPassword,
      },
    ]);

    const [ali, ahmed, sara] = users;

    console.log("Users created");

    // -------------------------
    // PROJECTS
    // -------------------------

    const projects = await Project.create([
      {
        name: "Project Management App",
        description: "A complete project management application",
        owner: ali._id,
      },
      {
        name: "E-Commerce Website",
        description: "Online shopping platform",
        owner: ahmed._id,
      },
    ]);

    const [project1, project2] = projects;

    console.log("Projects created");

    // -------------------------
    // TASKS
    // -------------------------

    const tasks = await Task.create([
      {
        title: "Create Login API",
        description: "Implement JWT authentication",
        project: project1._id,
        createdBy: ali._id,
        assignedTo: ahmed._id,
        status: "in-progress",
        priority: "high",
        dueDate: new Date("2026-10-01"),
      },

      {
        title: "Create Dashboard",
        description: "Build project dashboard",
        project: project1._id,
        createdBy: ali._id,
        assignedTo: sara._id,
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-10-05"),
      },

      {
        title: "Product API",
        description: "Create product CRUD APIs",
        project: project2._id,
        createdBy: ahmed._id,
        assignedTo: ali._id,
        status: "completed",
        priority: "high",
        dueDate: new Date("2026-09-28"),
      },
    ]);

    const [task1, task2, task3] = tasks;

    console.log("Tasks created");

    // -------------------------
    // COMMENTS
    // -------------------------

    const comments = await Comment.create([
      {
        content: "I have started working on the login API.",
        task: task1._id,
        user: ahmed._id,
      },

      {
        content: "Please complete this before the deadline.",
        task: task1._id,
        user: ali._id,
      },

      {
        content: "Dashboard design is ready.",
        task: task2._id,
        user: sara._id,
      },
    ]);

    console.log("Comments created");

    // -------------------------
    // NOTIFICATIONS
    // -------------------------

    await Notification.create([
      {
        recipient: ahmed._id,
        sender: ali._id,
        type: "task-assigned",
        message: "Ali assigned you a new task",
        task: task1._id,
        project: project1._id,
        isRead: false,
      },

      {
        recipient: sara._id,
        sender: ali._id,
        type: "task-assigned",
        message: "Ali assigned you a new task",
        task: task2._id,
        project: project1._id,
        isRead: false,
      },

      {
        recipient: ali._id,
        sender: ahmed._id,
        type: "task-completed",
        message: "Ahmed completed Product API",
        task: task3._id,
        project: project2._id,
        isRead: true,
      },
    ]);

    console.log("Notifications created");

    // -------------------------
    // ACTIVITIES
    // -------------------------

    await Activity.create([
      {
        user: ali._id,
        project: project1._id,
        task: task1._id,
        action: "task-created",
        description: 'Created task "Create Login API"',
      },

      {
        user: ali._id,
        project: project1._id,
        task: task1._id,
        action: "task-assigned",
        description: "Assigned task to Ahmed",
      },

      {
        user: ahmed._id,
        project: project1._id,
        task: task1._id,
        action: "comment-added",
        description: "Added a comment",
      },

      {
        user: ali._id,
        project: project1._id,
        task: task2._id,
        action: "task-created",
        description: 'Created task "Create Dashboard"',
      },

      {
        user: ahmed._id,
        project: project2._id,
        task: task3._id,
        action: "task-completed",
        description: 'Completed task "Product API"',
      },
    ]);

    console.log("Activities created");

    console.log("=================================");
    console.log("Database seeded successfully!");
    console.log("=================================");

    process.exit();
  } catch (error) {
    console.error("Seeder error:", error);
    process.exit(1);
  }
};

seedDatabase();