const db = require("../config/db");

const getDashboardData = (user_id, callback) => {
  const query = `
    SELECT
      u.company_name,
      u.account_status,
      bp.industry,
      bp.location,
      bp.logo,

      (SELECT COUNT(*) FROM connections
       WHERE (sender_id = ? OR receiver_id = ?)
       AND status = 'accepted') AS total_connections,

      (SELECT COUNT(*) FROM connections
       WHERE sender_id = ? AND status = 'pending') AS pending_sent,

      (SELECT COUNT(*) FROM connections
       WHERE receiver_id = ? AND status = 'pending') AS pending_received,

      (SELECT COUNT(*) FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE (c.user1_id = ? OR c.user2_id = ?)
       AND m.sender_id != ?
       AND m.is_read = FALSE) AS unread_messages

    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.id = ?
  `;

  db.query(query, [
    user_id, user_id,
    user_id,
    user_id,
    user_id, user_id, user_id,
    user_id
  ], callback);
};

module.exports = { getDashboardData };