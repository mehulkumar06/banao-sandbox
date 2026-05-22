import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import projectRoutes from "./routes/projectRoutes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ─── Socket.io setup ───────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// ─── Middleware ─────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ─── MongoDB connection ──────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─── Health check route ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Banao Sandbox API is running 🚀" });
});

// ─── API Routes ──────────────────────────────────────────────────────
app.use("/api/projects", projectRoutes);

// ─── Track active users per project ──────────────────────────────────
const projectUsers = {};

// ─── Socket.io events ───────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // ── Join a project room ──────────────────────────────────────────
  socket.on("join-project", (projectId) => {
    socket.join(projectId);

    // Track user count per project
    if (!projectUsers[projectId]) projectUsers[projectId] = new Set();
    projectUsers[projectId].add(socket.id);

    // Tell everyone in the room how many users are active
    io.to(projectId).emit("user-count", {
      count: projectUsers[projectId].size,
    });

    console.log(`📁 Socket ${socket.id} joined project: ${projectId}`);
  });

  // ── File change — broadcast to others in same project ────────────
  socket.on("file-change", ({ projectId, files, activeFile }) => {
    socket.to(projectId).emit("file-update", { files, activeFile });
  });

  // ── Package added — broadcast to others in same project ──────────
  socket.on("package-change", ({ projectId, packages }) => {
    socket.to(projectId).emit("package-update", { packages });
  });

  // ── User is typing indicator ──────────────────────────────────────
  socket.on("typing", ({ projectId, fileName }) => {
    socket.to(projectId).emit("user-typing", { fileName });
  });

  // ── Handle disconnect ─────────────────────────────────────────────
  socket.on("disconnecting", () => {
    // Remove from all project rooms they were in
    for (const room of socket.rooms) {
      if (projectUsers[room]) {
        projectUsers[room].delete(socket.id);

        io.to(room).emit("user-count", {
          count: projectUsers[room].size,
        });

        // Cleanup empty rooms
        if (projectUsers[room].size === 0) {
          delete projectUsers[room];
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ─── Start server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export { io };