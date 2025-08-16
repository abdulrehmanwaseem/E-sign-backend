import express from "express";
import {
  createBlog,
  deleteBlog,
  deleteUser,
  getBlogs,
  getDashboardStats,
  getUsers,
  getUser,
  updateBlog,
} from "../controllers/admin-dashboard.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

export const adminDashboardRouter = express.Router();

// Users Management
adminDashboardRouter.get("/users", isAuthenticated, getUsers);
adminDashboardRouter.get("/users/:id", isAuthenticated, getUser);
adminDashboardRouter.delete("/users/:id", isAuthenticated, deleteUser);

// Dashboard Overview
adminDashboardRouter.get("/dashboard", isAuthenticated, getDashboardStats);

// Blog Management
adminDashboardRouter.get("/blogs", isAuthenticated, getBlogs);
adminDashboardRouter.post("/blogs", isAuthenticated, createBlog);
adminDashboardRouter.put("/blogs/:id", isAuthenticated, updateBlog);
adminDashboardRouter.delete("/blogs/:id", isAuthenticated, deleteBlog);
