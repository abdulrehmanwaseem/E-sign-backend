import bcrypt from "bcryptjs";
import TryCatch from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import { ApiError } from "../utils/ApiError.js";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";
import { generateJwtToken } from "../utils/jwtUtils.js";
import { sendOTPEmail, generateOTP } from "../lib/emailService.js";

const signup = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;

  const userAlreadyExists = await prisma.user.findUnique({
    where: { email },
  });
  if (userAlreadyExists) {
    return next(
      new ApiError(
        "User With This email Already Exists, Try another email",
        400
      )
    );
  }
  const hashedPassword = await bcrypt.hash(password, 8);
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const createdUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      provider: "credentials",
      otp,
      otpExpires,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      provider: true,
      isEmailVerified: true,
    },
  });

  if (!createdUser) {
    return next(new ApiError("Something went wrong while creating user", 500));
  }

  // Send OTP email
  try {
    await sendOTPEmail(email, otp);
  } catch (error) {
    console.error("Failed to send OTP email:", error);
  }

  res.status(201).json({
    status: "success",
    message:
      "User registered successfully. Please verify your email with the OTP sent.",
    user: createdUser,
  });
});

const login = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    return next(new ApiError("User Does Not Exists, Try another Email", 400));
  }

  if (!user.password) {
    return next(new ApiError("Please login with your OAuth provider", 400));
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return next(new ApiError("Invalid email or password", 400));
  }

  if (!user.isEmailVerified) {
    return next(new ApiError("Please verify your email first", 400));
  }

  const loggedInUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      provider: true,
    },
  });
  if (!loggedInUser) {
    return next(new ApiError("Something went wrong while logging in", 500));
  }

  const token = generateJwtToken(loggedInUser);

  res.status(200).cookie(USER_TOKEN, token, cookieOptions).json({
    status: "success",
    user: loggedInUser,
    message: "Logged In Successfully",
  });
});

const verifyOTP = TryCatch(async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return next(new ApiError("User not found", 400));
  }

  if (user.isEmailVerified) {
    return next(new ApiError("Email already verified", 400));
  }

  if (!user.otp || user.otp !== otp) {
    return next(new ApiError("Invalid OTP", 400));
  }

  if (!user.otpExpires || new Date() > user.otpExpires) {
    return next(new ApiError("OTP expired", 400));
  }

  // Verify the user and clear OTP
  const verifiedUser = await prisma.user.update({
    where: { email },
    data: {
      isEmailVerified: true,
      otp: null,
      otpExpires: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      provider: true,
    },
  });

  const token = generateJwtToken(verifiedUser);

  res.status(200).cookie(USER_TOKEN, token, cookieOptions).json({
    status: "success",
    user: verifiedUser,
    message: "Email verified successfully",
  });
});

const resendOTP = TryCatch(async (req, res, next) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return next(new ApiError("User not found", 400));
  }

  if (user.isEmailVerified) {
    return next(new ApiError("Email already verified", 400));
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { email },
    data: { otp, otpExpires },
  });

  // Send OTP email
  try {
    await sendOTPEmail(email, otp);
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return next(new ApiError("Failed to send OTP email", 500));
  }

  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
});

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = req.user;
  res.json({
    status: "success",
    user,
    message: "Profile Fetch Successfully",
  });
});

const logout = TryCatch(async (req, res, next) => {
  res.clearCookie(USER_TOKEN, cookieOptions);
  res.status(204).end();
});

export { signup, login, logout, getMyProfile, verifyOTP, resendOTP };
