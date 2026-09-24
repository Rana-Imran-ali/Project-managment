const path = require("path");
const dotenv = require("dotenv");

// Load .env relative to server root directory with fallback
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const notificationRoutes= require("./routes/notificationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const userRoutes = require("./routes/userRoutes");
const connectDB = require("./config/db");
const attachmentRoutes = require("./routes/attachmentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// database
connectDB();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attachments", attachmentRoutes);


app.get("/", (req, res) => {
  res.json({
    message: "Project Management API is working!",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
