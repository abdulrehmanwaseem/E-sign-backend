import express from "express";
import {
  createAndSendDocument,
  deleteDocument,
  getDocumentAuditTrail,
  getDocumentById,
  getDocumentForSigning,
  getDocuments,
  submitSignature,
  getUserLibrary,
  checkFileExists,
  deleteDocumentFromLibrary,
  cancelDocument,
} from "../controllers/document.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";

const router = express.Router();

// Public routes (for signing)
router.get("/signing/:accessToken", getDocumentForSigning);
router.post("/signing/:accessToken/submit", submitSignature);

// Library routes
router.get("/library", isAuthenticated, getUserLibrary);
router.get("/check-exists", isAuthenticated, checkFileExists);
router.delete("/library/:id", isAuthenticated, deleteDocumentFromLibrary);

router.post(
  "/send-for-signing",
  isAuthenticated,
  singleFile,
  createAndSendDocument
);
router.get("/", isAuthenticated, getDocuments);
router.get("/:id", isAuthenticated, getDocumentById);
router.patch("/:id/cancel", isAuthenticated, cancelDocument);
router.delete("/:id", isAuthenticated, deleteDocument);
router.get("/:id/audit-trail", isAuthenticated, getDocumentAuditTrail);

export default router;
