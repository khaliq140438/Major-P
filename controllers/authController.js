const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");  // imported at top, not mid-file
const db     = require("../config/db");
const userModel = require("../models/userModel");

// ================= REGISTER =================
// Flow:
// 1. Validate required fields
// 2. Check if email/GST/CIN already exists
// 3. Hash password
// 4. Insert into users table (account_status = 'pending')
// 5. Create empty business_profile for the user
// 6. Return success — admin must approve before login works

const register = async (req, res) => {
  const {
    company_name,
    email,
    password,
    phone,
    gst_number,
    cin_number
  } = req.body;

  // Step 1 — Validate required fields
  if (!company_name || !email || !password || !gst_number || !cin_number) {
    return res.status(400).json({
      message: "Company name, email, password, GST number and CIN number are required."
    });
  }

  // Basic GST format check (15 characters alphanumeric)
  if (gst_number.length !== 15) {
    return res.status(400).json({ message: "GST number must be 15 characters." });
  }

  // Basic CIN format check (21 characters)
  if (cin_number.length !== 21) {
    return res.status(400).json({ message: "CIN number must be 21 characters." });
  }

  try {
    // Step 2 — Check if email already exists
    userModel.findUserByEmail(email, async (err, results) => {
      if (err) return res.status(500).json({ message: "Server error during registration." });

      if (results.length > 0) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }

      // Check if GST number already registered
      db.query("SELECT id FROM users WHERE gst_number = ?", [gst_number], async (err, gstResults) => {
        if (err) return res.status(500).json({ message: "Server error during registration." });

        if (gstResults.length > 0) {
          return res.status(400).json({ message: "This GST number is already registered." });
        }

        // Check if CIN number already registered
        db.query("SELECT id FROM users WHERE cin_number = ?", [cin_number], async (err, cinResults) => {
          if (err) return res.status(500).json({ message: "Server error during registration." });

          if (cinResults.length > 0) {
            return res.status(400).json({ message: "This CIN number is already registered." });
          }

          // Step 3 — Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Step 4 — Create user with pending status
          userModel.createUser(
            {
              company_name,
              email,
              password: hashedPassword,
              phone:    phone || null,
              gst_number,
              cin_number,
              role:           "business",
              account_status: "pending"
            },
            (err, result) => {
              if (err) return res.status(500).json({ message: "Failed to create account." });

              const userId = result.insertId;

              // Step 5 — Create empty business profile
              // Profile details are filled later by the user from their profile page
              // We insert a blank profile so the row exists for JOINs
              const profileQuery = `
                INSERT INTO business_profiles (user_id)
                VALUES (?)
              `;

              db.query(profileQuery, [userId], (profileErr) => {
                if (profileErr) {
                  // Profile creation failed but user was created
                  // Log it but don't fail the registration
                  // Admin can still approve — profile will be filled later
                  console.error("Warning: Could not create business profile for user", userId, profileErr.message);
                }
              });

              // Step 6 — Return success
              res.status(201).json({
                message: "Registration submitted successfully. Your account is pending admin approval. You will be notified once approved.",
                status: "pending"
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "An unexpected error occurred." });
  }
};

// ================= LOGIN =================
// Flow:
// 1. Validate fields
// 2. Find user by email
// 3. Compare password
// 4. Check account_status — block pending and rejected
// 5. Issue JWT token
// 6. Return token + basic user info

const login = (req, res) => {
  const { email, password } = req.body;

  // Step 1 — Validate
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  // Step 2 — Find user
  userModel.findUserByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error during login." });

    if (results.length === 0) {
      // Don't say "user not found" — security best practice
      // Telling attackers which emails exist is a vulnerability
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = results[0];

    // Step 3 — Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Step 4 — Check account status
    if (user.account_status === "pending") {
      return res.status(403).json({
        message: "Your account is pending admin approval. Please wait.",
        status: "pending"
      });
    }

    if (user.account_status === "rejected") {
      return res.status(403).json({
        message: "Your registration was rejected. Please contact support.",
        status: "rejected"
      });
    }

    // Step 5 — Issue JWT
    // Token contains id and role — available as req.user in all protected routes
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }  // 8 hours — reasonable for a business platform
    );

    // Step 6 — Return token + safe user info (no password)
    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id:           user.id,
        company_name: user.company_name,
        email:        user.email,
        role:         user.role
      }
    });
  });
};

module.exports = {
  register,
  login
};