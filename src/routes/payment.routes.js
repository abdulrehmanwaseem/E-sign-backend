import express from "express";
import {
  createStripeSession,
  stripeWebhook,
} from "../controllers/payment.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

router.post("/create-session", isAuthenticated, createStripeSession);
router.post("/webhook", stripeWebhook);

export default router;
