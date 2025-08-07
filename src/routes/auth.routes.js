import { Router } from "express";
import {
  getMyProfile,
  login,
  logout,
  signup,
  verifyOTP,
  resendOTP,
} from "../controllers/auth.controller.js";
import {
  loginValidator,
  registerValidator,
  validateHandler,
  verifyOTPValidator,
  resendOTPValidator,
} from "../lib/validators.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

export const authRouter = Router();

authRouter.route("/signup").post(registerValidator(), validateHandler, signup);
authRouter.route("/login").post(loginValidator(), validateHandler, login);
authRouter
  .route("/verify-otp")
  .post(verifyOTPValidator(), validateHandler, verifyOTP);
authRouter
  .route("/resend-otp")
  .post(resendOTPValidator(), validateHandler, resendOTP);
authRouter.route("/logout").post(logout);

// Protected Routes:
authRouter.get("/me", isAuthenticated, getMyProfile);
