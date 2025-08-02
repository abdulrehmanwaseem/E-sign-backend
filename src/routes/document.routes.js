import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  createAndSendDocument,
  deleteDocument,
  getDocumentAuditTrail,
  getDocumentById,
  getDocumentForSigning,
  getDocuments,
  submitSignature,
} from "../controllers/document.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { documentUpload } from "../utils/fileUpload.js";

// ES6 __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Protected routes (require authentication)
router.post(
  "/send-for-signing",
  isAuthenticated,
  documentUpload.single("file"),
  createAndSendDocument
);
router.get("/", isAuthenticated, getDocuments);
router.get("/:id", isAuthenticated, getDocumentById);
router.delete("/:id", isAuthenticated, deleteDocument);
router.get("/:id/audit-trail", isAuthenticated, getDocumentAuditTrail);

// Public routes (for signing)
router.get("/sign/:accessToken", getDocumentForSigning);
router.post("/sign/:accessToken/submit", submitSignature);

// Route for serving PDF files with CORS headers
router.get("/file/:filename", (req, res) => {
  const { filename } = req.params;

  // Basic security check - only allow PDF files
  if (!filename.endsWith(".pdf")) {
    return res.status(400).json({ error: "Only PDF files are allowed" });
  }

  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = path.basename(filename);

  // Set CORS headers first
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // Construct the file path
  const filePath = path.join(
    __dirname,
    "../../uploads/documents",
    sanitizedFilename
  );

  // Check if file exists first
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Set content type and cache headers
    res.set({
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=3600",
      "Accept-Ranges": "bytes",
    });

    // Send the file
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        console.error("Error serving PDF file:", err.message);
        res.status(err.status || 500).json({
          error: "Error serving file",
        });
      } else if (err) {
        console.error(
          "Error serving PDF file (headers already sent):",
          err.message
        );
      }
    });
  } catch (error) {
    console.error("File system error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;
