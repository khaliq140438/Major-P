const db = require("../config/db");

// ================= SEND MESSAGE =================
exports.sendMessage = (req, res) => {
  const sender_id   = req.user.id;
  const sender_role = req.user.role;
  const { receiver_id, message } = req.body;

  if (sender_role !== "business") {
    return res.status(403).json({ message: "Only business users can send messages." });
  }

  if (!receiver_id || !message || !message.trim()) {
    return res.status(400).json({ message: "Receiver and message are required." });
  }

  // Verify receiver exists and is an approved business
  db.query(
    "SELECT id, role FROM users WHERE id = ? AND account_status = 'approved'",
    [receiver_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error." });
      if (result.length === 0) return res.status(404).json({ message: "Receiver not found." });
      if (result[0].role !== "business") return res.status(403).json({ message: "Cannot message admin." });

      // Check sender and receiver are connected before allowing messages
      db.query(
        `SELECT id FROM connections
         WHERE status = 'accepted'
         AND (
           (sender_id = ? AND receiver_id = ?)
           OR
           (sender_id = ? AND receiver_id = ?)
         )`,
        [sender_id, receiver_id, receiver_id, sender_id],
        (err, connResult) => {
          if (err) return res.status(500).json({ message: "Server error." });
          if (connResult.length === 0) {
            return res.status(403).json({ message: "You must be connected to message this business." });
          }

          // Always store user1_id = MIN, user2_id = MAX
          const user1_id = Math.min(sender_id, receiver_id);
          const user2_id = Math.max(sender_id, receiver_id);

          // Find existing conversation or create new one
          db.query(
            "SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?",
            [user1_id, user2_id],
            (err, convoResult) => {
              if (err) return res.status(500).json({ message: "Server error." });

              if (convoResult.length > 0) {
                insertMessage(convoResult[0].id);
              } else {
                db.query(
                  "INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)",
                  [user1_id, user2_id],
                  (err, newConvo) => {
                    if (err) return res.status(500).json({ message: "Failed to create conversation." });
                    insertMessage(newConvo.insertId);
                  }
                );
              }
            }
          );
        }
      );
    }
  );

  function insertMessage(conversation_id) {
    db.query(
      "INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)",
      [conversation_id, sender_id, message.trim()],
      (err) => {
        if (err) return res.status(500).json({ message: "Failed to send message." });

        const messageData = {
          conversation_id,
          sender_id,
          message: message.trim(),
          created_at: new Date()
        };

        const io = req.app.get("io");
        io.to(`conversation_${conversation_id}`).to(`user_${receiver_id}`).emit("receive_message", messageData);

        res.status(201).json({
          message: "Message sent.",
          conversation_id
        });
      }
    );
  }
};

// ================= GET CONVERSATIONS =================
exports.getConversations = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT
      c.id AS conversation_id,
      CASE
        WHEN c.user1_id = ? THEN c.user2_id
        ELSE c.user1_id
      END AS other_user_id,
      u.company_name AS other_user_name,
      bp.logo        AS other_user_logo,
      (
        SELECT message FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT created_at FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS last_message_at,
      (
        SELECT COUNT(*) FROM messages
        WHERE conversation_id = c.id
        AND sender_id != ?
        AND is_read = FALSE
      ) AS unread_count
    FROM conversations c
    JOIN users u ON u.id = CASE
                              WHEN c.user1_id = ? THEN c.user2_id
                              ELSE c.user1_id
                            END
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY last_message_at DESC
  `;

  db.query(query, [userId, userId, userId, userId, userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch conversations." });
    res.json(results);
  });
};

// ================= GET MESSAGES =================
exports.getMessages = (req, res) => {
  const userId         = req.user.id;
  const conversationId = req.params.conversationId;

  // Verify this user belongs to this conversation
  db.query(
    "SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)",
    [conversationId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error." });
      if (result.length === 0) return res.status(403).json({ message: "Access denied." });

      // Fetch all messages in this conversation
      db.query(
        `SELECT id, sender_id, message, is_read, created_at
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
        [conversationId],
        (err, messages) => {
          if (err) return res.status(500).json({ message: "Failed to fetch messages." });

          // Mark all messages from the other user as read
          db.query(
            "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?",
            [conversationId, userId]
          );

          res.json(messages);
        }
      );
    }
  );
};