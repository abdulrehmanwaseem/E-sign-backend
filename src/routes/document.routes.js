import express from "express";
import {
  cancelDocument,
  checkFileExists,
  createAndSendDocument,
  deleteDocument,
  deleteDocumentFromLibrary,
  getDocumentAuditTrail,
  getDocumentById,
  getDocumentForSigning,
  getDocuments,
  getPreviousRecipients,
  getUserLibrary,
  sendPhoneVerificationOTP,
  submitSignature,
  verifyPhoneOTP,
} from "../controllers/document.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";

export const documentRouter = express.Router();

// Public routes (for signing)
documentRouter.get("/signing/:accessToken", getDocumentForSigning);
documentRouter.post("/signing/:accessToken/submit", submitSignature);

// Phone verification routes (public - for signing process)
documentRouter.post("/verify-phone/send-otp", sendPhoneVerificationOTP);
documentRouter.post("/verify-phone/verify-otp", verifyPhoneOTP);

// Library routes
documentRouter.get("/library", isAuthenticated, getUserLibrary);
documentRouter.get(
  "/previous-recipients",
  isAuthenticated,
  getPreviousRecipients
);
documentRouter.get("/check-exists", isAuthenticated, checkFileExists);
documentRouter.delete(
  "/library/:id",
  isAuthenticated,
  deleteDocumentFromLibrary
);

documentRouter.post(
  "/send-for-signing",
  isAuthenticated,
  singleFile,
  createAndSendDocument
);
documentRouter.get("/", isAuthenticated, getDocuments);
documentRouter.get("/:id", isAuthenticated, getDocumentById);
documentRouter.patch("/:id/cancel", isAuthenticated, cancelDocument);
documentRouter.delete("/:id", isAuthenticated, deleteDocument);
documentRouter.get("/:id/audit-trail", isAuthenticated, getDocumentAuditTrail);
