const db = require("../config/db");

const sendRequest = (sender_id, receiver_id, callback) => {
  // Check if a connection already exists in either direction before inserting
  const checkQuery = `
    SELECT id FROM connections
    WHERE (sender_id = ? AND receiver_id = ?)
    OR (sender_id = ? AND receiver_id = ?)
  `;
  db.query(checkQuery, [sender_id, receiver_id, receiver_id, sender_id], (err, results) => {
    if (err) return callback(err);
    if (results.length > 0) {
      const error = new Error('Connection already exists');
      error.code = 'ER_DUP_ENTRY';
      return callback(error);
    }
    const query = `INSERT INTO connections (sender_id, receiver_id) VALUES (?, ?)`;
    db.query(query, [sender_id, receiver_id], callback);
  });
};

const updateRequestStatus = (connection_id, status, callback) => {
  const query = `UPDATE connections SET status = ? WHERE id = ?`;
  db.query(query, [status, connection_id], callback);
};

const getMyConnections = (user_id, callback) => {
  const query = `
    SELECT
      c.id AS connection_id,
      CASE
        WHEN c.sender_id = ? THEN c.receiver_id
        ELSE c.sender_id
      END AS connected_user_id,
      u.company_name,
      bp.industry,
      bp.location,
      bp.logo,
      CASE
        WHEN bp.industry IS NOT NULL THEN true
        ELSE false
      END AS is_verified
    FROM connections c
    JOIN users u
      ON u.id = CASE
                  WHEN c.sender_id = ? THEN c.receiver_id
                  ELSE c.sender_id
                END
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE (c.sender_id = ? OR c.receiver_id = ?)
      AND c.status = 'accepted'
  `;
  db.query(query, [user_id, user_id, user_id, user_id], callback);
};

const getReceivedRequests = (user_id, callback) => {
  const query = `
    SELECT
      c.id,
      c.sender_id,
      c.status,
      u.company_name,
      u.id AS user_id,
      bp.industry,
      bp.location,
      bp.logo
    FROM connections c
    JOIN users u ON c.sender_id = u.id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE c.receiver_id = ?
      AND c.status = 'pending'
    ORDER BY c.created_at DESC
  `;
  db.query(query, [user_id], callback);
};

const getConnectionById = (connection_id, callback) => {
  const query = "SELECT * FROM connections WHERE id = ?";
  db.query(query, [connection_id], callback);
};

module.exports = {
  sendRequest,
  updateRequestStatus,
  getMyConnections,
  getReceivedRequests,
  getConnectionById
};