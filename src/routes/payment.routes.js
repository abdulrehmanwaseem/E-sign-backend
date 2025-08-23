import express from "express";
import {
  createStripeSession,
  stripeWebhook,
} from "../controllers/payment.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

export const paymentRoutes = express.Router();

paymentRoutes.post("/create-session", isAuthenticated, createStripeSession);
paymentRoutes.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);
