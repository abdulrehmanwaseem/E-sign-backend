import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

export const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      avatar: true,
      provider: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });
  res.json({ success: true, data: users });
});

export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      avatar: true,
      provider: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.json({ success: true, message: "User deleted" });
});

// DASHBOARD
export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await prisma.user.count();
  const totalDocuments = await prisma.document.count();
  const totalDocumentsSigned = await prisma.document.count({
    where: { status: "SIGNED" },
  });

  res.json({
    success: true,
    data: {
      totalUsers,
      subcriptions: 0,
      totalEarned: 0,
      totalDocuments,
      totalDocumentsSigned,
    },
  });
});

// BLOGS
export const getBlogs = asyncHandler(async (req, res) => {
  const blogs = await prisma.blog.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      image: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: blogs });
});

export const createBlog = asyncHandler(async (req, res) => {
  const { title, description, image } = req.body;
  const blog = await prisma.blog.create({
    data: { title, description, image },
  });
  res.status(201).json({ success: true, data: blog });
});

export const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, image } = req.body;
  const blog = await prisma.blog.update({
    where: { id },
    data: { title, description, image },
  });
  res.json({ success: true, data: blog });
});

export const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.blog.delete({ where: { id } });
  res.json({ success: true, message: "Blog deleted" });
});
