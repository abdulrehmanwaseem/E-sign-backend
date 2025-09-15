import multer from "multer";
import handleMulterError from "../utils/multerApiError.js";
import crypto from "crypto";

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF files are allowed."), false);
  }
};

const multerUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // Max size: 10mb
  },
  fileFilter: fileFilter,
});

export const singleFile = (req, res, next) => {
  multerUpload.single("file")(req, res, (err) => {
    if (err) {
      handleMulterError(err, next, 1);
      return;
    }

    validateFileIntegrity(req, res, next);
  });
};

/**
 * Validate file integrity using hash
 */
export const validateFileIntegrity = (req, res, next) => {
  try {
    if (req.file && req.body.fileHash) {
      console.log("🔍 Validating file integrity...");

      // Generate hash of received file
      const hash = crypto.createHash("sha256");
      hash.update(req.file.buffer);
      const calculatedHash = hash.digest("hex");

      // Compare with hash from frontend
      if (calculatedHash !== req.body.fileHash) {
        return res.status(400).json({
          success: false,
          message: "File integrity check failed. File may be corrupted.",
        });
      }

      // Validate file size matches
      if (req.file.size.toString() !== req.body.fileSize) {
        return res.status(400).json({
          success: false,
          message: "File size validation failed.",
        });
      }

      console.log("✅ File integrity validated successfully");
    }

    next();
  } catch (error) {
    console.error("File validation error:", error);
    return res.status(400).json({
      success: false,
      message: "File validation failed",
      error: error.message,
    });
  }
};
