import express from "express";
import asyncHandler from "express-async-handler";
import { testEmail } from "../lib/testEmail.js";
import { ApiError } from "../utils/ApiError.js";

const router = express.Router();

// @desc    Test email functionality
// @route   POST /api/email/test
// @access  Public (for testing only - remove in production)
router.post(
  "/test",
  asyncHandler(async (req, res) => {
    try {
      const result = await testEmail();
      res.status(200).json({
        success: true,
        message: "Test email sent successfully",
        data: result,
      });
    } catch (error) {
      console.error("Test email error:", error);
      throw new ApiError("Failed to send test email", 500);
    }
  })
);

export default router;
