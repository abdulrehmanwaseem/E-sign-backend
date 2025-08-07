import express from "express";
import {
  createAndSendDocument,
  deleteDocument,
  downloadSignedPDF,
  getDocumentAuditTrail,
  getDocumentById,
  getDocumentForSigning,
  getDocuments,
  submitSignature,
} from "../controllers/document.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";

const router = express.Router();

// Public routes (for signing)
router.get("/signing/:accessToken", getDocumentForSigning);
router.post("/signing/:accessToken/submit", submitSignature);

router.post(
  "/send-for-signing",
  isAuthenticated,
  singleFile,
  createAndSendDocument
);
router.get("/", isAuthenticated, getDocuments);
router.get("/:id", isAuthenticated, getDocumentById);
router.get("/:id/download-signed", isAuthenticated, downloadSignedPDF);
router.delete("/:id", isAuthenticated, deleteDocument);
router.get("/:id/audit-trail", isAuthenticated, getDocumentAuditTrail);

export default router;
