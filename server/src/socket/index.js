/**
 * Socket.io singleton
 *
 * Usage (server.js):
 *   const { initIO } = require('./socket');
 *   initIO(httpServer);
 *
 * Usage (any controller):
 *   const { getIO } = require('../socket');
 *   getIO().to('project:' + projectId).emit('task-updated', task);
 */

let _io = null;

/**
 * Initialise the Socket.io server, attach room handlers, and return the instance.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initIO(httpServer) {
  const { Server } = require("socket.io");

  _io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  _io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // ── Room: project ──────────────────────────────────────────────
    socket.on("join-project", (projectId) => {
      if (!projectId) return;
      socket.join(`project:${projectId}`);
      console.log(`   ↳ ${socket.id} joined project:${projectId}`);
    });

    socket.on("leave-project", (projectId) => {
      if (!projectId) return;
      socket.leave(`project:${projectId}`);
      console.log(`   ↳ ${socket.id} left project:${projectId}`);
    });

    // ── Room: task ─────────────────────────────────────────────────
    socket.on("join-task", (taskId) => {
      if (!taskId) return;
      socket.join(`task:${taskId}`);
      console.log(`   ↳ ${socket.id} joined task:${taskId}`);
    });

    socket.on("leave-task", (taskId) => {
      if (!taskId) return;
      socket.leave(`task:${taskId}`);
      console.log(`   ↳ ${socket.id} left task:${taskId}`);
    });

    // ── Room: user (private notifications) ────────────────────────
    socket.on("join-user", (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`   ↳ ${socket.id} joined user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return _io;
}

/**
 * Return the already-initialised Socket.io instance.
 * Throws if called before initIO().
 */
function getIO() {
  if (!_io) {
    throw new Error(
      "Socket.io not initialised yet. Call initIO(httpServer) first."
    );
  }
  return _io;
}

module.exports = { initIO, getIO };
