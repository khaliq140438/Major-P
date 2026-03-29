const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Read token from secure HttpOnly cookies instead of Authorization header
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No authentication session found." });
  }

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