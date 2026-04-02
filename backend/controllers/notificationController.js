const db = require("../config/db");

// ================= GET UNREAD NOTIFICATIONS =================
// Called on login/dashboard load to check for missed notifications
const getUnreadNotifications = (req, res) => {
  const user_id = req.user.id;

  db.query(
    `SELECT id, type, message, created_at
     FROM notifications
     WHERE user_id = ? AND is_read = FALSE
     ORDER BY created_at DESC`,
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch notifications." });
      res.json(results);
    }
  );
};

// ================= MARK AS READ =================
// Called after frontend shows the popup
// Accepts single id or 'all' to mark everything read
const markAsRead = (req, res) => {
  const user_id = req.user.id;
  const { notification_id } = req.body;

  // If notification_id is 'all' — mark everything read for this user
  // If a specific id is passed — mark just that one
  const query = notification_id === "all"
    ? `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`
    : `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`;

  const params = notification_id === "all"
    ? [user_id]
    : [notification_id, user_id];

  db.query(query, params, (err) => {
    if (err) return res.status(500).json({ message: "Failed to mark notification as read." });
    res.json({ message: "Notification marked as read." });
  });
};

module.exports = {
  getUnreadNotifications,
  markAsRead
};