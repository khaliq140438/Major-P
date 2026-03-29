const db = require("../config/db");

// ================= CREATE USER =================
// Called during registration.
// Inserts into users table with pending status.
const createUser = (userData, callback) => {
  const {
    company_name,
    email,
    password,
    phone,
    gst_number,
    cin_number,
    role,
    account_status
  } = userData;

  const query = `
    INSERT INTO users 
      (company_name, email, password, phone, gst_number, cin_number, role, account_status)
    VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      company_name,
      email,
      password,
      phone        || null,
      gst_number,
      cin_number,
      role         || "business",
      account_status || "pending"  // always pending on registration
    ],
    callback
  );
};

// ================= FIND USER BY EMAIL =================
// Used during login to fetch user and check password.
const findUserByEmail = (email, callback) => {
  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], callback);
};

// ================= FIND USER BY ID =================
// Useful for profile fetches and token verification.
const findUserById = (id, callback) => {
  const query = "SELECT id, company_name, email, phone, gst_number, cin_number, role, account_status, created_at FROM users WHERE id = ?";
  db.query(query, [id], callback);
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};