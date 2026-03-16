const db              = require("../config/db");
const connectionModel = require("../models/connectionModel");

// ================= SEND CONNECTION REQUEST =================
const sendConnection = (req, res) => {
  const sender_id   = req.user.id;
  const sender_role = req.user.role;
  const { receiver_id } = req.body;

  if (!receiver_id) {
    return res.status(400).json({ message: "Receiver ID is required." });
  }

  if (sender_role !== "business") {
    return res.status(403).json({ message: "Only business users can send connections." });
  }

  if (sender_id === parseInt(receiver_id)) {
    return res.status(400).json({ message: "You cannot connect with yourself." });
  }

  // Check receiver exists and is a business
  db.query("SELECT id, role FROM users WHERE id = ? AND account_status = 'approved'", [receiver_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error." });
    if (result.length === 0) return res.status(404).json({ message: "Business not found." });
    if (result[0].role !== "business") return res.status(403).json({ message: "Cannot connect with admin." });

    connectionModel.sendRequest(sender_id, receiver_id, (err) => {
      if (err) {
        // Duplicate entry = already sent a request
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Connection request already sent." });
        }
        return res.status(500).json({ message: "Failed to send connection request." });
      }

      // Emit to receiver's personal room
      // Room name MUST match: socket.join(`user_${userId}`) in server.js
      const io = req.app.get("io");
      io.to(`user_${receiver_id}`).emit("connection_request", {
        sender_id,
        receiver_id,
        type: "new_request"
      });

      res.status(201).json({ message: "Connection request sent." });
    });
  });
};

// ================= ACCEPT CONNECTION =================
const acceptConnection = (req, res) => {
  const { connection_id } = req.body;
  const user_id = req.user.id;

  if (!connection_id) {
    return res.status(400).json({ message: "Connection ID is required." });
  }

  connectionModel.getConnectionById(connection_id, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error." });
    if (results.length === 0) return res.status(404).json({ message: "Connection not found." });

    const connection = results[0];

    if (connection.receiver_id !== user_id) {
      return res.status(403).json({ message: "Only the receiver can accept this request." });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({ message: "This request is no longer pending." });
    }

    connectionModel.updateRequestStatus(connection_id, "accepted", (err) => {
      if (err) return res.status(500).json({ message: "Failed to accept connection." });

      // Emit to sender's personal room
      // Room name MUST match: socket.join(`user_${userId}`) in server.js
      const io = req.app.get("io");
      io.to(`user_${connection.sender_id}`).emit("connection_accepted", {
        connection_id,
        accepted_by: user_id,
        type: "accepted"
      });

      res.json({ message: "Connection accepted." });
    });
  });
};

// ================= REJECT CONNECTION =================
const rejectConnection = (req, res) => {
  const { connection_id } = req.body;
  const user_id = req.user.id;

  if (!connection_id) {
    return res.status(400).json({ message: "Connection ID is required." });
  }

  connectionModel.getConnectionById(connection_id, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error." });
    if (results.length === 0) return res.status(404).json({ message: "Connection not found." });

    const connection = results[0];

    if (connection.receiver_id !== user_id) {
      return res.status(403).json({ message: "Only the receiver can reject this request." });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({ message: "This request is no longer pending." });
    }

    connectionModel.updateRequestStatus(connection_id, "rejected", (err) => {
      if (err) return res.status(500).json({ message: "Failed to reject connection." });
      res.json({ message: "Connection rejected." });
    });
  });
};

// ================= VIEW MY CONNECTIONS =================
const viewConnections = (req, res) => {
  const user_id = req.user.id;

  connectionModel.getMyConnections(user_id, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch connections." });
    res.json(results);
  });
};

// ================= VIEW RECEIVED REQUESTS =================
const viewReceivedRequests = (req, res) => {
  const user_id = req.user.id;

  connectionModel.getReceivedRequests(user_id, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch requests." });
    res.json(results);
  });
};

module.exports = {
  sendConnection,
  acceptConnection,
  rejectConnection,
  viewConnections,
  viewReceivedRequests
};