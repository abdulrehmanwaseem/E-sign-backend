import bcrypt from "bcryptjs";
import TryCatch from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";
import { sendOTPEmail } from "../lib/emailService.js";
import {
  formatPhoneNumber,
  sendPhoneOTP,
  twilioVerifyOTP,
  validatePhoneNumber,
} from "../lib/smsService.js";
import { ApiError } from "../utils/ApiError.js";
import { extractNameFromEmail, generateOTP } from "../utils/helpers.js";
import { generateJwtToken } from "../utils/jwtUtils.js";
import {
  getClientIp,
  getDeviceInfo,
  getGeoLocation,
} from "../utils/userInfo.js";

const signup = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;

  const userAlreadyExists = await prisma.user.findUnique({ where: { email } });
  if (userAlreadyExists) {
    return next(
      new ApiError(
        "User With This email Already Exists, Try another email",
        400
      )
    );
  }

  const ip = getClientIp(req);
  const location = await getGeoLocation(ip);
  const deviceInfo = getDeviceInfo(req);

  console.log("Location Info:", location);

  const hashedPassword = await bcrypt.hash(password, 8);
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  const avatarUrl = `https://avatar.iran.liara.run/username?username=${extractNameFromEmail(
    email
  )}`;

  const createdUser = await prisma.user.create({
    data: {
      email,
      avatar: avatarUrl,
      password: hashedPassword,
      provider: "credentials",
      otp,
      otpExpires,
      device: deviceInfo ? JSON.stringify(deviceInfo) : null,
      locations: location
        ? {
            create: {
              ip: location.ip,
              city: location.city,
              region: location.region,
              country: location.country,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          }
        : undefined,
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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return next(new ApiError("User Does Not Exist, Try another Email", 400));
  if (!user.password)
    return next(new ApiError("Please login with your OAuth provider", 400));

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid)
    return next(new ApiError("Invalid email or password", 400));

  if (!user.isEmailVerified) {
    return next(new ApiError("Please verify your email first", 400));
  }

  // 🔹 Gather client environment details
  const ip = getClientIp(req);
  const location = await getGeoLocation(ip);
  const device = getDeviceInfo(req);

  // 🔹 Store device + location in DB
  await prisma.user.update({
    where: { id: user.id },
    data: {
      device: device ? JSON.stringify(device) : user.device,
      locations: location
        ? {
            upsert: {
              where: { userId: user.id },
              create: {
                ip: location.ip,
                city: location.city,
                region: location.region,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              },
              update: {
                ip: location.ip,
                city: location.city,
                region: location.region,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              },
            },
          }
        : undefined,
    },
  });

  // 🔹 Return logged-in user
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

  const token = generateJwtToken(loggedInUser);

  res.status(200).cookie(USER_TOKEN, token, cookieOptions).json({
    status: "success",
    user: loggedInUser,
    message: "Logged In Successfully",
  });
});

const verifyEmail = TryCatch(async (req, res, next) => {
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
  const user = req?.user;
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

// Phone verification functions
const sendPhoneVerification = TryCatch(async (req, res, next) => {
  const { phone } = req.body;
  const userId = req.user.id;

  if (!phone) {
    return next(new ApiError("Phone number is required", 400));
  }

  if (!validatePhoneNumber(phone)) {
    return next(new ApiError("Please provide a valid phone number", 400));
  }

  const formattedPhone = formatPhoneNumber(phone);

  // Check if phone number is already verified by another user
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: formattedPhone,
      isPhoneVerified: true,
      id: { not: userId },
    },
  });

  if (existingUser) {
    return next(
      new ApiError("This phone number is already verified by another user", 400)
    );
  }

  const phoneOtp = generateOTP();
  const phoneOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Update user with phone and OTP
  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: formattedPhone,
      phoneOtp,
      phoneOtpExpires,
      isPhoneVerified: false,
    },
  });

  // Send SMS OTP
  try {
    await sendPhoneOTP(formattedPhone, phoneOtp);
  } catch (error) {
    console.error("Failed to send SMS OTP:", error);
    return next(new ApiError("Failed to send SMS OTP. Please try again.", 500));
  }

  res.status(200).json({
    status: "success",
    message: "Phone verification code sent successfully",
  });
});

const verifyPhoneOTP = TryCatch(async (req, res, next) => {
  const { otp } = req.body;
  const userId = req.user.id;

  if (!otp) {
    return next(new ApiError("OTP is required", 400));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return next(new ApiError("User not found", 400));
  }

  if (!user.phone) {
    return next(
      new ApiError(
        "No phone number found. Please send verification code first.",
        400
      )
    );
  }

  if (user.isPhoneVerified) {
    return next(new ApiError("Phone number already verified", 400));
  }

  // Use Twilio Verify service to verify OTP
  try {
    const verificationResult = await twilioVerifyOTP(user.phone, otp);

    if (!verificationResult.success) {
      return next(new ApiError("Invalid or expired OTP", 400));
    }

    // Verify the phone (no need to clear OTP fields since Twilio handles it)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isPhoneVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        provider: true,
        phone: true,
        isPhoneVerified: true,
      },
    });

    res.status(200).json({
      status: "success",
      user: updatedUser,
      message: "Phone number verified successfully",
    });
  } catch (error) {
    console.error("Phone OTP verification error:", error);
    return next(new ApiError("Failed to verify OTP. Please try again.", 500));
  }
});

const resendPhoneOTP = TryCatch(async (req, res, next) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return next(new ApiError("User not found", 400));
  }

  if (!user.phone) {
    return next(
      new ApiError(
        "No phone number found. Please send verification code first.",
        400
      )
    );
  }

  if (user.isPhoneVerified) {
    return next(new ApiError("Phone number already verified", 400));
  }

  // Send SMS OTP using Twilio Verify (no need to generate/store OTP manually)
  try {
    const result = await sendPhoneOTP(user.phone);
    console.log("Twilio verification resent:", result);
  } catch (error) {
    console.error("Failed to resend SMS OTP:", error);
    return next(new ApiError("Failed to send SMS OTP. Please try again.", 500));
  }

  res.status(200).json({
    status: "success",
    message: "Phone verification code sent successfully",
  });
});

// Twilio webhook handler
const twilioWebhookHandler = (req, res) => {
  const event = req.body;
  console.log("Received Twilio webhook event:", event);

  res.status(200).json({ received: true });
};

export {
  getMyProfile,
  login,
  logout,
  resendOTP,
  resendPhoneOTP,
  sendPhoneVerification,
  signup,
  verifyEmail,
  verifyPhoneOTP,
  twilioWebhookHandler,
};
