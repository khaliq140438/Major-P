const mysql = require("mysql2");
require("dotenv").config();

// createPool is better than createConnection because:
// 1. Maintains multiple connections — handles concurrent requests
// 2. Auto-reconnects if connection drops
// 3. Standard practice for production Node.js apps
const db = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,   // max 10 simultaneous DB connections
  queueLimit:         0     // unlimited queue
});

// Test the connection on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ MySQL Connected Successfully");
    connection.release(); // release back to pool immediately
  }
});

module.exports = db;