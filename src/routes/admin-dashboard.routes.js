import express from "express";
import {
  createBlog,
  deleteBlog,
  deleteUser,
  getAllUsers,
  getBlogBySlug,
  getBlogs,
  getDashboardStats,
  getUser,
  updateBlog,
} from "../controllers/admin-dashboard.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";
import isAdmin from "../middlewares/isAdmin.js";

export const adminDashboardRouter = express.Router();

// Users Management
adminDashboardRouter.get("/users", isAuthenticated, isAdmin, getAllUsers);
adminDashboardRouter.get("/users/:id", isAuthenticated, isAdmin, getUser);
adminDashboardRouter.delete("/users/:id", isAuthenticated, isAdmin, deleteUser);

// Dashboard Overview
adminDashboardRouter.get("/stats", isAuthenticated, isAdmin, getDashboardStats);

// Blog Management (Public Routes)
adminDashboardRouter.get("/blogs", getBlogs);
adminDashboardRouter.get("/blogs/:slug", getBlogBySlug);

// Blog Management (Protected Routes)
adminDashboardRouter.post(
  "/blogs",
  isAuthenticated,
  isAdmin,
  singleFile,
  createBlog
);
adminDashboardRouter.put(
  "/blogs/:id",
  isAuthenticated,
  isAdmin,
  singleFile,
  updateBlog
);
adminDashboardRouter.delete("/blogs/:id", isAuthenticated, isAdmin, deleteBlog);
