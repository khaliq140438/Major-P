const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role } available in all controllers
    next();
  } catch (error) {
    // 401 = unauthorized (not 400 bad request)
    // Covers both invalid AND expired tokens
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = verifyToken;