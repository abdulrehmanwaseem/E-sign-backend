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
  getTemplates,
} from "../controllers/document.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";

export const documentRouter = express.Router();

// Public routes (for signing)
documentRouter.get("/signing/:accessToken", getDocumentForSigning);
documentRouter.post("/signing/:accessToken/submit", submitSignature);

// Library routes
documentRouter.get("/library", isAuthenticated, getUserLibrary);
documentRouter.get("/check-exists", isAuthenticated, checkFileExists);
documentRouter.delete(
  "/library/:id",
  isAuthenticated,
  deleteDocumentFromLibrary
);

// Template routes:
documentRouter.get("/templates", isAuthenticated, getTemplates);

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
