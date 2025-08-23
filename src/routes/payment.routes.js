import express from "express";
import {
  cancelProSubscription,
  createCustomerPortalSession,
  createStripeSession,
  getSubscriptionDetails,
  stripeWebhook,
} from "../controllers/payment.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

export const paymentRoutes = express.Router();

paymentRoutes.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

paymentRoutes.post("/create-session", isAuthenticated, createStripeSession);
paymentRoutes.post(
  "/cancel-subscription",
  isAuthenticated,
  cancelProSubscription
);

paymentRoutes.get("/subscription", isAuthenticated, getSubscriptionDetails);
paymentRoutes.post(
  "/customer-portal",
  isAuthenticated,
  createCustomerPortalSession
);
