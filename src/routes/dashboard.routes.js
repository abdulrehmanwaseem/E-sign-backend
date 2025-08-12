import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { getDashboardData } from "../controllers/dashboard.controller.js";

export const dashboardRouter = express.Router();

dashboardRouter.get("/", isAuthenticated, getDashboardData);
