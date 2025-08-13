import express from "express";
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  getTemplateStats,
  updateTemplate,
} from "../controllers/template.controller.js";
import isAdmin from "../middlewares/isAdmin.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";

export const templateRouter = express.Router();

// Public/Authenticated routes
templateRouter.get("/", isAuthenticated, getTemplates);
templateRouter.get("/stats", isAuthenticated, isAdmin, getTemplateStats);

// Admin-only routes
templateRouter.post("/", isAuthenticated, isAdmin, singleFile, createTemplate);
templateRouter.put(
  "/:id",
  isAuthenticated,
  isAdmin,
  singleFile,
  updateTemplate
);
templateRouter.delete("/:id", isAuthenticated, isAdmin, deleteTemplate);
