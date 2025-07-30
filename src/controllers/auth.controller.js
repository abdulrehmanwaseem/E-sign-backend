import bcrypt from "bcryptjs";
import TryCatch from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import { ApiError } from "../utils/ApiError.js";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";
import { generateJwtToken } from "../utils/jwtUtils.js";

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

  const createdUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      provider: "credentials",
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

  if (!createdUser) {
    return next(new ApiError("Something went wrong while creating user", 500));
  }

  const token = generateJwtToken(createdUser);

  res.status(201).cookie(USER_TOKEN, token, cookieOptions).json({
    status: "success",
    message: "User registered successfully",
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

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = req.user;
  res.json({
    status: "success",
    user,
    message: "Profile Fetch Successfully",
  });
});

const logout = TryCatch(async (req, res, next) => {
  res.status(204).clearCookie(USER_TOKEN, cookieOptions).json({
    status: "success",
    message: "User Logged out successfully",
  });
});

export { signup, login, logout, getMyProfile };
