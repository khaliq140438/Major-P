const db           = require("../config/db");
const profileModel = require("../models/profileModel");
const path         = require("path");
const fs           = require("fs");

// ================= GET MY PROFILE =================
// Returns full profile for the logged-in user.
// Joins users + business_profiles into one response.
const getMyProfile = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT
      u.id,
      u.company_name,
      u.email,
      u.phone,
      u.gst_number,
      u.cin_number,
      u.role,
      u.account_status,
      u.created_at,
      bp.company_description,
      bp.industry,
      bp.location,
      bp.website,
      bp.logo,
      bp.founded_year,
      bp.employee_count
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch profile." });
    if (results.length === 0) return res.status(404).json({ message: "Profile not found." });
    res.json(results[0]);
  });
};

// ================= GET PUBLIC PROFILE =================
// Returns a business profile visible to other users.
// Used when someone clicks on a business in Search or Connections.
// Includes analytics data for credibility display.
const getPublicProfile = (req, res) => {
  const { userId } = req.params;

  const profileQuery = `
    SELECT
      u.id,
      u.company_name,
      u.account_status,
      bp.company_description,
      bp.industry,
      bp.location,
      bp.website,
      bp.logo,
      bp.founded_year,
      bp.employee_count,
      (
        SELECT COUNT(*) FROM connections
        WHERE (sender_id = u.id OR receiver_id = u.id)
        AND status = 'accepted'
      ) AS total_connections
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.id = ?
    AND u.role = 'business'
    AND u.account_status = 'approved'
  `;

  db.query(profileQuery, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch profile." });
    if (results.length === 0) return res.status(404).json({ message: "Business not found." });

    const profile = results[0];

    // Fetch analytics alongside the profile
    const analyticsQuery = `
      SELECT
        r.month,
        r.year,
        r.revenue,
        bi.founded_year,
        bi.employee_count,
        bi.business_type,
        bi.annual_turnover,
        cl.total_clients,
        cl.repeat_client_percent,
        cl.industries_served,
        cs.total_score,
        cs.profile_score,
        cs.connection_score,
        cs.activity_score,
        cs.tenure_score
      FROM users u
      LEFT JOIN analytics_business_info bi ON u.id = bi.user_id
      LEFT JOIN analytics_clients cl       ON u.id = cl.user_id
      LEFT JOIN analytics_credibility_score cs ON u.id = cs.user_id
      LEFT JOIN analytics_revenue r        ON u.id = r.user_id
      WHERE u.id = ?
      ORDER BY r.year ASC, r.month ASC
    `;

    db.query(analyticsQuery, [userId], (err, analyticsResults) => {
      if (err) return res.status(500).json({ message: "Failed to fetch analytics." });

      // Separate revenue rows from single-row analytics
      const revenueData = analyticsResults.map(row => ({
        month:   row.month,
        year:    row.year,
        revenue: row.revenue
      })).filter(r => r.month !== null);

      const analyticsRow = analyticsResults[0] || {};

      res.json({
        profile,
        analytics: {
          revenue:     revenueData,
          businessInfo: {
            founded_year:    analyticsRow.founded_year,
            employee_count:  analyticsRow.employee_count,
            business_type:   analyticsRow.business_type,
            annual_turnover: analyticsRow.annual_turnover
          },
          clients: {
            total_clients:          analyticsRow.total_clients,
            repeat_client_percent:  analyticsRow.repeat_client_percent,
            industries_served:      analyticsRow.industries_served
          },
          credibilityScore: {
            total_score:      analyticsRow.total_score      || 0,
            profile_score:    analyticsRow.profile_score    || 0,
            connection_score: analyticsRow.connection_score || 0,
            activity_score:   analyticsRow.activity_score   || 0,
            tenure_score:     analyticsRow.tenure_score     || 0
          }
        }
      });
    });
  });
};

// ================= UPDATE PROFILE =================
// Lets a business user update their profile details.
// Only updates business_profiles table — not users table.
const updateProfile = (req, res) => {
  const userId = req.user.id;
  const {
    company_description,
    industry,
    location,
    website,
    founded_year,
    employee_count
  } = req.body;

  const query = `
    UPDATE business_profiles
    SET
      company_description = COALESCE(?, company_description),
      industry            = COALESCE(?, industry),
      location            = COALESCE(?, location),
      website             = COALESCE(?, website),
      founded_year        = COALESCE(?, founded_year),
      employee_count      = COALESCE(?, employee_count),
      updated_at          = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `;

  db.query(
    query,
    [company_description, industry, location, website, founded_year, employee_count, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to update profile." });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Profile not found." });
      res.json({ message: "Profile updated successfully." });
    }
  );
};

// ================= UPLOAD LOGO =================
const uploadLogo = (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  // Full URL so frontend can display it directly
  const serverUrl  = process.env.SERVER_URL || "http://localhost:5000";
  const newLogoPath = `${serverUrl}/uploads/${req.file.filename}`;

  // Get old logo to delete old file from disk
  db.query("SELECT logo FROM business_profiles WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch current logo." });

    const oldLogo = results[0]?.logo;

    // Safely delete old file — only if it's a local file path
    if (oldLogo && oldLogo.includes("/uploads/")) {
      try {
        const filename = oldLogo.split("/uploads/")[1];
        const fullPath = path.join(__dirname, "../uploads", filename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        // File deletion failed — log but don't crash
        console.error("Could not delete old logo:", e.message);
      }
    }

    // Save new logo URL to DB
    db.query("UPDATE business_profiles SET logo = ? WHERE user_id = ?", [newLogoPath, userId], (err) => {
      if (err) return res.status(500).json({ message: "Failed to save logo." });

      res.json({
        message: "Logo uploaded successfully.",
        logo: newLogoPath
      });
    });
  });
};

module.exports = {
  getMyProfile,
  getPublicProfile,
  updateProfile,
  uploadLogo
};