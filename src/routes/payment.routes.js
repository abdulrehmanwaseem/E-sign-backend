import express from "express";
import { createStripeSession } from "../controllers/payment.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

router.post("/create-session", isAuthenticated, createStripeSession);

export default router;
