// seed.js — run once with: node seed.js
// Creates the admin user for Business Connect platform

require("dotenv").config();
const bcrypt = require("bcrypt");
const mysql  = require("mysql2");

const db = mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ── Admin credentials — change password after first login ──
const ADMIN_EMAIL    = "admin@businessconnect.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME     = "Platform Admin";

const run = async () => {
  console.log("🌱 Business Connect — Seed Script");
  console.log("──────────────────────────────────");

  db.connect((err) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
      process.exit(1);
    }
    console.log("✅ Connected to database");
    seedAdmin();
  });
};

const seedAdmin = async () => {
  // Check if admin already exists — never create duplicates
  db.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
    async (err, results) => {
      if (err) {
        console.error("❌ Query failed:", err.message);
        db.end();
        return;
      }

      if (results.length > 0) {
        console.log("⚠️  Admin already exists. Skipping creation.");
        console.log("   Email:", ADMIN_EMAIL);
        db.end();
        return;
      }

      // Hash password using same bcrypt config as authController
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      // Insert admin — uses dummy GST/CIN since they are required UNIQUE fields
      // These values won't conflict with real business registrations
      const query = `
        INSERT INTO users 
          (company_name, email, password, role, account_status, gst_number, cin_number)
        VALUES 
          (?, ?, ?, 'admin', 'approved', ?, ?)
      `;

      db.query(
        query,
        [
          ADMIN_NAME,
          ADMIN_EMAIL,
          hashedPassword,
          "ADMINGST000000X",   // placeholder — 15 chars, won't clash with real GST
          "ADMINCIN00000000000X0", // placeholder — 21 chars
        ],
        (err, result) => {
          if (err) {
            console.error("❌ Failed to create admin:", err.message);
            db.end();
            return;
          }

          console.log("✅ Admin user created successfully!");
          console.log("──────────────────────────────────");
          console.log("   Email   :", ADMIN_EMAIL);
          console.log("   Password:", ADMIN_PASSWORD);
          console.log("   Role    : admin");
          console.log("──────────────────────────────────");
          console.log("⚠️  Change the password after your first login.");
          db.end();
        }
      );
    }
  );
};

run();