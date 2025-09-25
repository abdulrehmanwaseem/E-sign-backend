import { Router } from "express";
import {
  getMyProfile,
  login,
  logout,
  resendOTP,
  resendPhoneOTP,
  sendPhoneVerification,
  signup,
  twilioWebhookHandler,
  verifyEmail,
  verifyPhoneOTP,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  loginValidator,
  registerValidator,
  resendOTPValidator,
  sendPhoneVerificationValidator,
  validateHandler,
  verifyEmailValidator,
  verifyPhoneOTPValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../lib/validators.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

export const authRouter = Router();

authRouter.post("/webhook/twilio", twilioWebhookHandler);
authRouter.post("/webhook/twilio/error", twilioWebhookHandler);

authRouter.route("/signup").post(registerValidator(), validateHandler, signup);
authRouter.route("/login").post(loginValidator(), validateHandler, login);
authRouter
  .route("/verify-email")
  .post(verifyEmailValidator(), validateHandler, verifyEmail);
authRouter
  .route("/resend-otp")
  .post(resendOTPValidator(), validateHandler, resendOTP);
authRouter
  .route("/forgot-password")
  .post(forgotPasswordValidator(), validateHandler, forgotPassword);
authRouter
  .route("/reset-password")
  .post(resetPasswordValidator(), validateHandler, resetPassword);
authRouter.route("/logout").post(logout);

// Phone verification routes (protected - requires email verification first)
authRouter.post(
  "/send-phone-verification",
  isAuthenticated,
  sendPhoneVerificationValidator(),
  validateHandler,
  sendPhoneVerification
);
authRouter.post(
  "/verify-phone-otp",
  isAuthenticated,
  verifyPhoneOTPValidator(),
  validateHandler,
  verifyPhoneOTP
);
authRouter.post("/resend-phone-otp", isAuthenticated, resendPhoneOTP);

// Protected Routes:
authRouter.get("/me", isAuthenticated, getMyProfile);
