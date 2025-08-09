import { body, validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join(", ");

    return next(new ApiError(errorMessages, 400));
  }
  return next();
};

const registerValidator = () => [
  body("email").isString().notEmpty().withMessage("Please Enter Email"),
  body("password")
    .isString()
    .notEmpty()
    .withMessage("Please Enter Password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const loginValidator = () => [
  body("email").isString().notEmpty().withMessage("Please Enter Email"),
  body("password").isString().notEmpty().withMessage("Please Enter Password"),
];

const verifyOTPValidator = () => [
  body("email").isString().notEmpty().withMessage("Please Enter Email"),
  body("otp")
    .isString()
    .notEmpty()
    .withMessage("Please Enter OTP")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

const resendOTPValidator = () => [
  body("email").isString().notEmpty().withMessage("Please Enter Email"),
];

const sendPhoneVerificationValidator = () => [
  body("phone")
    .isString()
    .notEmpty()
    .withMessage("Please enter phone number")
    .custom((value) => {
      // E.164 general check: + and 8-15 digits
      const v = String(value).trim();
      const e164 = /^\+[1-9]\d{7,14}$/;
      const digits = v.replace(/\D/g, "");
      if (e164.test(v) || e164.test(`+${digits}`)) return true;
      throw new Error(
        "Please enter a valid international phone number (E.164)"
      );
    }),
];

const verifyPhoneOTPValidator = () => [
  body("otp")
    .isString()
    .notEmpty()
    .withMessage("Please Enter OTP")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

export {
  loginValidator,
  registerValidator,
  validateHandler,
  verifyOTPValidator,
  resendOTPValidator,
  sendPhoneVerificationValidator,
  verifyPhoneOTPValidator,
};
