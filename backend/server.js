// ================= IMPORTS =================
const express      = require("express");
const http         = require("http");
const cors         = require("cors");
const { Server }   = require("socket.io");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
require("dotenv").config();

// Database connection
require("./config/db");

// ================= ROUTES =================
const authRoutes        = require("./routes/authRoutes");
const profileRoutes     = require("./routes/profileRoutes");
const connectionRoutes  = require("./routes/connectionRoutes");
const searchRoutes      = require("./routes/searchRoutes");
const analyticsRoutes   = require("./routes/analyticsRoutes");
const dashboardRoutes   = require("./routes/dashboardRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const messageRoutes     = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// ================= APP SETUP =================
const app  = express();
const PORT = process.env.PORT || 5000;

// ================= CORS =================
// Same origin for both REST and Socket.IO
const ALLOWED_ORIGIN = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true
}));

// ================= MIDDLEWARE =================
app.use(helmet({
  crossOriginResourcePolicy: false,
})); // Provides essential HTTP security headers while allowing cross-origin image loads
app.use(cookieParser()); // Enables reading HttpOnly cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= RATE LIMITING =================
// Global rate limiting to prevent overall DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, 
  message: { message: "Too many requests from this IP, please try again in 15 minutes." }
});
app.use(globalLimiter);

// Strict rate limiting specifically for authentication to prevent brute-forcing passwords
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { message: "Too many authentication attempts. Please try again later." }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Serve uploaded files (logos, etc.)
app.use("/uploads", express.static("uploads"));

// ================= API ROUTES =================
app.use("/api/auth",        authRoutes);
app.use("/api/profile",     profileRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/search",      searchRoutes);
app.use("/api/analytics",   analyticsRoutes);
app.use("/api/dashboard",   dashboardRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/messages",    messageRoutes);
app.use("/api/notifications", notificationRoutes);

// ================= ROOT ROUTE =================
app.get("/", (req, res) => {
  res.json({ message: "Business Connect API is running." });
});

// ================= 404 HANDLER =================
// Catches any request that didn't match a route above
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ================= GLOBAL ERROR HANDLER =================
// Catches any error passed via next(err) from controllers
// Must have 4 parameters — Express identifies it as error middleware
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }

  // Handle common MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'This record already exists in the system.' });
  }
  if (err.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({ message: 'Data provided exceeds maximum length allowed.' });
  }

  console.error(`[🚨 ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? "An unexpected system error occurred. Please try again later."
    : err.message || "Internal server error";

  res.status(statusCode).json({ message, status: 'error' });
});

// ================= SOCKET.IO SETUP =================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,   // Fixed: was "*", now matches REST CORS
    credentials: true
  }
});

const onlineUsers = new Map(); // userId → socketId

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // User joins their personal room and marks themselves online
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
    onlineUsers.set(Number(userId), socket.id);
    // Broadcast to everyone that this user is online
    socket.broadcast.emit("user_online", Number(userId));
    console.log(`📡 User ${userId} is online`);
  });

  // Send current online users list to whoever asks
  socket.on("get_online_users", () => {
    socket.emit("online_users_list", Array.from(onlineUsers.keys()));
  });

  // User joins a conversation room for real-time messages
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`💬 Joined conversation ${conversationId}`);
  });

  socket.on("disconnect", () => {
    // Find which userId this socket belonged to
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        // Broadcast to everyone that this user is offline
        socket.broadcast.emit("user_offline", userId);
        console.log(`❌ User ${userId} is offline`);
        break;
      }
    }
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Make io accessible in all controllers via req.app.get("io")
app.set("io", io);

// ================= START SERVER =================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});