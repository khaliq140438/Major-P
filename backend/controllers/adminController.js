const db = require("../config/db");

// ================= GET ADMIN STATS =================
// Returns platform-wide numbers for the admin dashboard.
const getAdminStats = (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'business')                                       AS total_businesses,
      (SELECT COUNT(*) FROM users WHERE account_status = 'pending' AND role = 'business')        AS pending_registrations,
      (SELECT COUNT(*) FROM users WHERE account_status = 'approved' AND role = 'business')       AS approved_businesses,
      (SELECT COUNT(*) FROM connections WHERE status = 'accepted')                AS total_connections
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch stats." });
    res.json({ stats: results[0] });
  });
};

// ================= GET ALL USERS =================
// Returns all business users with their profile info.
// Used in the Admin Users table.
const getAllUsers = (req, res) => {
  const query = `
    SELECT
      u.id,
      u.company_name,
      u.email,
      u.gst_number,
      u.cin_number,
      u.account_status,
      u.created_at,
      bp.industry,
      bp.location,
      (
        SELECT COUNT(*) FROM connections
        WHERE (sender_id = u.id OR receiver_id = u.id)
        AND status = 'accepted'
      ) AS connection_count
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.role = 'business'
    ORDER BY u.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch users." });
    res.json(results);
  });
};

// ================= GET RECENT USERS =================
// Returns the 10 most recently registered businesses.
// Shown as a quick overview on the admin dashboard.
const getRecentUsers = (req, res) => {
  const query = `
    SELECT
      u.id,
      u.company_name,
      u.email,
      u.account_status,
      u.created_at,
      bp.industry,
      bp.location
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.role = 'business'
    ORDER BY u.created_at DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch recent users." });
    res.json(results);
  });
};

// ================= GET PENDING REGISTRATIONS =================
// Returns businesses waiting for admin approval.
// This is the main admin task — review and approve/reject.
const getPendingRegistrations = (req, res) => {
  const query = `
    SELECT
      u.id,
      u.company_name,
      u.email,
      u.phone,
      u.gst_number,
      u.cin_number,
      u.created_at,
      bp.industry,
      bp.location,
      bp.website,
      bp.company_description
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.account_status = 'pending'
    AND u.role = 'business'
    ORDER BY u.created_at ASC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch pending registrations." });
    res.json(results);
  });
};

const emailService = require('../utils/emailService');

// ================= APPROVE REGISTRATION =================
// Admin approves a pending business registration.
// Sets account_status to 'approved' — user can now log in.
// Dispatches immediate automated SMTP email to registered business.
const approveRegistration = (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const query = `
    UPDATE users
    SET account_status = 'approved'
    WHERE id = ? AND account_status = 'pending'
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to approve registration." });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found or already processed." });
    }

    // Fire and Forget an asynchronous SMTP Email Dispatch
    db.query(`SELECT email, company_name FROM users WHERE id = ?`, [userId], (err, rows) => {
      if (!err && rows.length > 0) {
        emailService.sendApprovalEmail(rows[0].email, rows[0].company_name);
      }
    });

    res.json({ message: "Registration approved. Business can now log in." });
  });
};

// ================= REJECT REGISTRATION =================
// Admin rejects a pending business registration.
// Sets account_status to 'rejected' — user cannot log in.
// Dispatches immediate automated SMTP rejection notice.
const rejectRegistration = (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const query = `
    UPDATE users
    SET account_status = 'rejected'
    WHERE id = ? AND account_status = 'pending'
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to reject registration." });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found or already processed." });
    }

    // Fire and Forget an asynchronous SMTP Email Dispatch
    db.query(`SELECT email, company_name FROM users WHERE id = ?`, [userId], (err, rows) => {
      if (!err && rows.length > 0) {
        emailService.sendRejectionEmail(rows[0].email, rows[0].company_name);
      }
    });

    res.json({ message: "Registration rejected." });
  });
};

// ================= SUSPEND USER =================
// Admin revokes an approved user's access to login.
// Data safely persists but effectively freezes them out of the platform.
const suspendUser = (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const query = `
    UPDATE users
    SET account_status = 'suspended'
    WHERE id = ? AND account_status = 'approved'
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to suspend user." });
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found or not in approved state." });
    
    res.json({ message: "User access has been successfully suspended." });
  });
};

// ================= UNSUSPEND USER =================
// Admin reactivates a suspended user's access allowing them to log back in.
const unsuspendUser = (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const query = `
    UPDATE users
    SET account_status = 'approved'
    WHERE id = ? AND account_status = 'suspended'
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to unsuspend user." });
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found or not currently suspended." });

    res.json({ message: "User access successfully restored." });
  });
};

// ================= REMOVE USER =================
// Permanent database destructive hard-delete.
// Wrapped in a MySQL transaction to definitively obliterate the user and all associated child relational data globally.
const removeUser = (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ message: "Failed to access database connection pool." });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ message: "Transaction start failed." });
      }

      const queries = [
        { sql: `DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?`, params: [userId, userId] },
        { sql: `DELETE FROM connections WHERE sender_id = ? OR receiver_id = ?`, params: [userId, userId] },
        { sql: `DELETE FROM analytics_monthly WHERE user_id = ?`, params: [userId] },
        { sql: `DELETE FROM analytics_credibility_score WHERE user_id = ?`, params: [userId] },
        { sql: `DELETE FROM business_profiles WHERE user_id = ?`, params: [userId] },
        { sql: `DELETE FROM users WHERE id = ?`, params: [userId] }
      ];

      const executeQuery = (index) => {
        if (index >= queries.length) {
          return connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ message: "Failed to commit user deletion." });
              });
            }
            connection.release();
            res.json({ message: "User permanently destroyed." });
          });
        }

        const q = queries[index];
        connection.query(q.sql, q.params, (err, _) => {
          if (err) {
             console.error("User Demolition Step Failed:", err);
             return connection.rollback(() => {
               connection.release();
               res.status(500).json({ message: "Database violation error. Transaction reversed." });
             });
          }
          executeQuery(index + 1);
        });
      };

      executeQuery(0);
    });
  });
};

// ================= SINGLE module.exports =================
// Previously this file had TWO module.exports — second one overwrote the first.
// All functions exported once, cleanly.
module.exports = {
  getAdminStats,
  getAllUsers,
  getRecentUsers,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  suspendUser,
  unsuspendUser,
  removeUser
};