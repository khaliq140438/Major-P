const db = require("../config/db");

// ================= GET ADMIN STATS =================
// Returns platform-wide numbers for the admin dashboard.
const getAdminStats = (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'business')                        AS total_businesses,
      (SELECT COUNT(*) FROM users WHERE account_status = 'pending')               AS pending_registrations,
      (SELECT COUNT(*) FROM users WHERE account_status = 'approved')              AS approved_businesses,
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

// ================= APPROVE REGISTRATION =================
// Admin approves a pending business registration.
// Sets account_status to 'approved' — user can now log in.
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

    res.json({ message: "Registration approved. Business can now log in." });
  });
};

// ================= REJECT REGISTRATION =================
// Admin rejects a pending business registration.
// Sets account_status to 'rejected' — user cannot log in.
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

    res.json({ message: "Registration rejected." });
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
  rejectRegistration
};