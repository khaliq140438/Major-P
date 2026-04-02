const db             = require("../config/db");
const analyticsModel = require("../models/analyticsModel");

// ================= HELPER: COMPUTE MoM GROWTH =================
// Takes an array of monthly rows (oldest to newest) and returns
// the same array with a mom_growth field added to each row.
// First month always gets null (no previous month to compare against).
//
// Formula: ((current - previous) / previous) * 100
// Rounded to 2 decimal places.

const attachMoMGrowth = (rows) => {
  let mapped = rows.map((row, index) => {
    if (index === 0) {
      return { ...row, mom_growth: null };
    }
    const prev = rows[index - 1].revenue;
    const curr = row.revenue;

    if (!prev || prev === 0) {
      return { ...row, mom_growth: null };
    }

    const growth = parseFloat((((curr - prev) / prev) * 100).toFixed(2));
    return { ...row, mom_growth: growth };
  });

  return mapped;
};

// ================= HELPER: COMPUTE AND SAVE CREDIBILITY SCORE =================
// Called internally after any data change (monthly entry saved).
// Reads live data from 3 tables — no manual input from user.
//
// Score breakdown (total = 100):
//
//   profile_score   (0–30):
//     Checks 8 fields across users + business_profiles.
//     Fields: logo, industry, location, website,
//             company_description, phone, founded_year, employee_count
//     Each field = ~3.75 pts. We use simple 4/4/4/4/4/4/4/2 distribution = 30 max.
//     Simpler approach: floor(filled_fields / 8 * 30)
//
//   analytics_score (0–40):
//     4 points per month of data entered in analytics_monthly, max 10 months.
//
//   network_score   (0–15):
//     3 points per accepted connection, max 5 connections = 15 pts.
//
//   tenure_score    (0–15):
//     1 point per 15 days since account was created, max 15 pts (~225 days).

const computeAndSaveCredibilityScore = (userId, callback) => {

  // Single query that pulls everything we need from 3 tables
  const query = `
    SELECT
      -- Profile fields (business_profiles)
      bp.logo,
      bp.industry,
      bp.location,
      bp.website,
      bp.company_description,
      bp.founded_year,
      bp.employee_count,

      -- Profile field (users)
      u.phone,

      -- Network: accepted connections
      (
        SELECT COUNT(*)
        FROM connections
        WHERE (sender_id = ? OR receiver_id = ?)
        AND status = 'accepted'
      ) AS connection_count,

      -- Account age in days
      DATEDIFF(NOW(), u.created_at) AS account_age_days

    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.id = ?
  `;

  db.query(query, [userId, userId, userId], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(new Error("User not found"));

    const data = results[0];

    // --- PROFILE SCORE (0–30) ---
    // Count how many of the 8 fields are filled
    const profileFields = [
      data.logo,
      data.industry,
      data.location,
      data.website,
      data.company_description,
      data.phone,
      data.founded_year,
      data.employee_count
    ];
    const filledCount = profileFields.filter(f => f !== null && f !== undefined && f !== '' && f !== 0).length;
    const profile_score = Math.floor((filledCount / 8) * 30);

    // --- NETWORK SCORE (0–15) ---
    // 3 pts per accepted connection, capped at 5 connections
    const network_score = Math.min(data.connection_count * 3, 15);

    // --- TENURE SCORE (0–15) ---
    // 1 pt per 15 days on platform, capped at 15 pts (~225 days to max out)
    const tenure_score = Math.min(Math.floor(data.account_age_days / 15), 15);

    // --- ANALYTICS SCORE (0–40) ---
    // Fetch entry count separately from analyticsModel
    analyticsModel.getMonthlyEntryCount(userId, (err, countResults) => {
      if (err) return callback(err);

      const entryCount = countResults[0]?.entry_count || 0;
      // 4 pts per month entered, max 10 months = 40 pts
      const analytics_score = Math.min(entryCount * 4, 40);

      const total_score = profile_score + analytics_score + network_score + tenure_score;

      analyticsModel.upsertCredibilityScore(
        userId,
        { profile_score, analytics_score, network_score, tenure_score, total_score },
        callback
      );
    });
  });
};

// ================= GET ALL MY ANALYTICS =================
// Main endpoint hit by the Analytics page on load.
// Recomputes credibility score first, then returns everything in one response.
// Response shape:
// {
//   monthlyData: [...],       // up to 10 rows with mom_growth attached
//   credibilityScore: { ... } // fresh computed score
// }

const getMyAnalytics = (req, res) => {
  const userId = req.user.id;

  // Always recompute score on fetch so it reflects latest profile/connection changes
  computeAndSaveCredibilityScore(userId, (err) => {
    if (err) console.error("Score computation error:", err.message);

    Promise.all([
      new Promise((resolve, reject) =>
        analyticsModel.getMonthlyData(userId, (e, rows) =>
          e ? reject(e) : resolve(attachMoMGrowth(rows))
        )
      ),
      new Promise((resolve, reject) =>
        analyticsModel.getCredibilityScore(userId, (e, rows) =>
          e ? reject(e) : resolve(rows[0] || {
            profile_score: 0,
            analytics_score: 0,
            network_score: 0,
            tenure_score: 0,
            total_score: 0
          })
        )
      )
    ])
      .then(([monthlyData, credibilityScore]) => {
        res.json({ monthlyData, credibilityScore });
      })
      .catch(() => {
        res.status(500).json({ message: "Failed to fetch analytics." });
      });
  });
};

// ================= SAVE MONTHLY ENTRY =================
// POST /api/analytics/monthly
// User submits one month at a time via the form.
// Validates all 3 required fields, then upserts.
// Recomputes credibility score after save.

const saveMonthlyEntry = (req, res) => {
  const userId = req.user.id;
  const { month, year, revenue, gross_profit_margin, client_count } = req.body;

  // Validate required fields
  if (!month || !year || revenue === undefined || gross_profit_margin === undefined || client_count === undefined) {
    return res.status(400).json({
      message: "Month, year, revenue, gross profit margin and client count are all required."
    });
  }

  // Validate ranges
  if (month < 1 || month > 12) {
    return res.status(400).json({ message: "Month must be between 1 and 12." });
  }

  const currentYear = new Date().getFullYear();
  if (year < 2000 || year > currentYear) {
    return res.status(400).json({ message: `Year must be between 2000 and ${currentYear}.` });
  }

  if (revenue < 0) {
    return res.status(400).json({ message: "Revenue cannot be negative." });
  }

  if (gross_profit_margin < 0 || gross_profit_margin > 100) {
    return res.status(400).json({ message: "Gross profit margin must be between 0 and 100." });
  }

  if (client_count < 0) {
    return res.status(400).json({ message: "Client count cannot be negative." });
  }

  analyticsModel.upsertMonthlyEntry(
    userId,
    {
      month:               parseInt(month),
      year:                parseInt(year),
      revenue:             parseFloat(revenue),
      gross_profit_margin: parseFloat(gross_profit_margin),
      client_count:        parseInt(client_count)
    },
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to save monthly data." });

      // Recompute credibility score in background — don't block the response
      computeAndSaveCredibilityScore(userId, (scoreErr) => {
        if (scoreErr) console.error("Score recompute failed:", scoreErr.message);
      });

      res.status(201).json({ message: "Monthly data saved successfully." });
    }
  );
};

// ================= GET MONTHLY DATA =================
// GET /api/analytics/monthly
// Returns last 10 months with MoM growth attached.
// Used when frontend needs just the chart data without the full analytics page load.

const getMonthlyData = (req, res) => {
  const userId = req.user.id;

  analyticsModel.getMonthlyData(userId, (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch monthly data." });
    res.json(attachMoMGrowth(rows));
  });
};

// ================= GET CREDIBILITY SCORE =================
// GET /api/analytics/credibility-score
// Recomputes and returns the latest credibility score.

const getCredibilityScore = (req, res) => {
  const userId = req.user.id;

  computeAndSaveCredibilityScore(userId, (err) => {
    if (err) return res.status(500).json({ message: "Failed to compute score." });

    analyticsModel.getCredibilityScore(userId, (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch score." });
      res.json(results[0] || { total_score: 0 });
    });
  });
};

module.exports = {
  getMyAnalytics,
  saveMonthlyEntry,
  getMonthlyData,
  getCredibilityScore
};