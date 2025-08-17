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

export const adminDashboardRouter = express.Router();

// Users Management
adminDashboardRouter.get("/users", isAuthenticated, getAllUsers);
adminDashboardRouter.get("/users/:id", isAuthenticated, getUser);
adminDashboardRouter.delete("/users/:id", isAuthenticated, deleteUser);

// Dashboard Overview
adminDashboardRouter.get("/stats", isAuthenticated, getDashboardStats);

// Blog Management
adminDashboardRouter.get("/blogs", getBlogs);
adminDashboardRouter.get("/blogs/:slug", isAuthenticated, getBlogBySlug);
adminDashboardRouter.post("/blogs", isAuthenticated, singleFile, createBlog);
adminDashboardRouter.put("/blogs/:id", isAuthenticated, singleFile, updateBlog);
adminDashboardRouter.delete("/blogs/:id", isAuthenticated, deleteBlog);
