import { Router } from "express";
import {
  getMyProfile,
  login,
  logout,
  signup,
  verifyEmail,
  resendOTP,
  sendPhoneVerification,
  verifyPhoneOTP,
  resendPhoneOTP,
  telnyxWebhookHandler,
} from "../controllers/auth.controller.js";
// Telnyx webhook endpoint (public, no auth)
import {
  loginValidator,
  registerValidator,
  validateHandler,
  verifyEmailValidator,
  resendOTPValidator,
  sendPhoneVerificationValidator,
  verifyPhoneOTPValidator,
} from "../lib/validators.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { sendPhoneOTP } from "../lib/smsService.js";

export const authRouter = Router();

authRouter.post("/webhook/telnyx", telnyxWebhookHandler);
authRouter.post("/webhook/telnyx/error", telnyxWebhookHandler);

authRouter.route("/signup").post(registerValidator(), validateHandler, signup);
authRouter.route("/login").post(loginValidator(), validateHandler, login);
authRouter
  .route("/verify-email")
  .post(verifyEmailValidator(), validateHandler, verifyEmail);
authRouter
  .route("/resend-otp")
  .post(resendOTPValidator(), validateHandler, resendOTP);
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

// Test endpoint
authRouter.post("/test-sms", async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await sendPhoneOTP(phone, "123456");
    res.json({ success: true, messageId: result.data?.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
