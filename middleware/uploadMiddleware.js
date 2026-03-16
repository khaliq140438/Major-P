const multer = require("multer");
const path   = require("path");

// ================= STORAGE CONFIG =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder must exist in project root
  },
  filename: function (req, file, cb) {
    // Format: userId_timestamp.ext
    // e.g. 42_1712345678901.png
    // Including userId makes it traceable to the business
    const userId    = req.user ? req.user.id : "unknown";
    const timestamp = Date.now();
    const ext       = path.extname(file.originalname).toLowerCase();
    cb(null, `${userId}_${timestamp}${ext}`);
  }
});

// ================= FILE TYPE VALIDATION =================
// Only allow image files for logo uploads
// This runs BEFORE the file is saved to disk
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);  // accept the file
  } else {
    cb(new Error("Only JPEG, PNG, and WEBP images are allowed."), false); // reject
  }
};

// ================= UPLOAD CONFIG =================
const upload = multer({
  storage:    storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024  // 5MB max
    // Without this limit, someone could upload a 500MB file
    // and crash your server
  }
});

module.exports = upload;