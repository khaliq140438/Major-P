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
// Analytics section now uses analytics_monthly + analytics_credibility_score.
// Old tables (analytics_revenue, analytics_business_info, analytics_clients) are gone.
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

    // ── Fetch monthly analytics data (last 10 months) ──
    // Gross profit computed in SQL as revenue × margin / 100.
    // MoM growth is computed in JS after fetch — same logic as analyticsController.
    const monthlyQuery = `
  SELECT * FROM (
    SELECT
      month,
      year,
      revenue,
      gross_profit_margin,
      client_count,
      ROUND((revenue * gross_profit_margin / 100), 2) AS gross_profit
    FROM analytics_monthly
    WHERE user_id = ?
    ORDER BY year DESC, month DESC
    LIMIT 10
  ) AS last10
  ORDER BY year ASC, month ASC
`;

    // ── Fetch credibility score ──
    const scoreQuery = `
      SELECT
        total_score,
        profile_score,
        analytics_score,
        network_score,
        tenure_score
      FROM analytics_credibility_score
      WHERE user_id = ?
    `;

    // Run both queries in parallel
    Promise.all([
      new Promise((resolve, reject) =>
        db.query(monthlyQuery, [userId], (err, rows) => err ? reject(err) : resolve(rows))
      ),
      new Promise((resolve, reject) =>
        db.query(scoreQuery, [userId], (err, rows) => err ? reject(err) : resolve(rows))
      )
    ])
      .then(([monthlyRows, scoreRows]) => {

        // Attach MoM growth to each monthly row
        const monthlyData = monthlyRows.map((row, index) => {
          if (index === 0) return { ...row, mom_growth: null };
          const prev = monthlyRows[index - 1].revenue;
          const curr = row.revenue;
          if (!prev || prev === 0) return { ...row, mom_growth: null };
          const growth = parseFloat((((curr - prev) / prev) * 100).toFixed(2));
          return { ...row, mom_growth: growth };
        });

        const credibilityScore = scoreRows[0] || {
          total_score:     0,
          profile_score:   0,
          analytics_score: 0,
          network_score:   0,
          tenure_score:    0
        };

        res.json({
          profile,
          analytics: {
            monthlyData,
            credibilityScore
          }
        });
      })
      .catch(() => {
        res.status(500).json({ message: "Failed to fetch analytics." });
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

  const serverUrl   = process.env.SERVER_URL || "http://localhost:5000";
  const newLogoPath = `${serverUrl}/uploads/${req.file.filename}`;

  db.query("SELECT logo FROM business_profiles WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch current logo." });

    const oldLogo = results[0]?.logo;

    if (oldLogo && oldLogo.includes("/uploads/")) {
      try {
        const filename = oldLogo.split("/uploads/")[1];
        const fullPath = path.join(__dirname, "../uploads", filename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        console.error("Could not delete old logo:", e.message);
      }
    }

    db.query("UPDATE business_profiles SET logo = ? WHERE user_id = ?", [newLogoPath, userId], (err) => {
      if (err) return res.status(500).json({ message: "Failed to save logo." });
      res.json({ message: "Logo uploaded successfully.", logo: newLogoPath });
    });
  });
};

module.exports = {
  getMyProfile,
  getPublicProfile,
  updateProfile,
  uploadLogo
};