import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const {
    search,
    joinDate,
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page

  // Build where clause for filtering
  let whereClause = {};

  // Search filter - search in firstName, lastName, and email
  if (search && search.trim()) {
    whereClause.OR = [
      {
        firstName: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
    ];
  }

  if (joinDate) {
    try {
      const filterDate = new Date(joinDate);
      const startDate = new Date(filterDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(filterDate);
      endDate.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } catch (error) {
      return next(new ApiError(400, "Invalid date format"));
    }
  }

  // Build orderBy clause
  let orderBy = {};
  if (sortBy === "fullName") {
    // For full name sorting, sort by firstName first, then lastName
    orderBy = [{ firstName: sortOrder }, { lastName: sortOrder }];
  } else {
    orderBy[sortBy] = sortOrder;
  }

  try {
    // Get users with filtering, pagination, and sorting
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          avatar: true,
          provider: true,
          createdAt: true,
          firstName: true,
          lastName: true,
          phone: true,
          _count: {
            select: {
              documents: true,
            },
          },
        },
        orderBy: orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      // Get total count for pagination info
      prisma.user.count({ where: whereClause }),
    ]);

    // Format the response
    const formatUserName = (user) => {
      if (user?.firstName && user?.lastName) {
        return `${user.firstName} ${user.lastName}`.trim();
      } else if (user?.firstName) {
        return user.firstName;
      } else if (user?.lastName) {
        return user.lastName;
      } else {
        return "N/A";
      }
    };

    const formattedUsers = users.map((user) => ({
      ...user,
      fullName: formatUserName(user),
      documentCount: user._count.documents,
      // Remove the _count field as we've extracted it
      _count: undefined,
    }));

    res.json({
      success: true,
      data: formattedUsers,
      meta: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum * limitNum < totalCount,
        hasPreviousPage: pageNum > 1,
      },
      filters: {
        search: search || null,
        joinDate: joinDate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return next(new ApiError(500, "Failed to fetch users"));
  }
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
      _count: {
        select: {
          documents: true,
        },
      },
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
  const { from, to } = req.query;

  // Create date filter object
  let dateFilter = {};
  if (from && to) {
    dateFilter = {
      createdAt: {
        gte: new Date(from),
        lte: new Date(to + "T23:59:59.999Z"), // Include the entire end date
      },
    };
  }

  // Apply date filter to queries
  const totalUsers = await prisma.user.count({
    where: dateFilter,
  });

  const totalDocuments = await prisma.document.count({
    where: dateFilter,
  });

  const totalDocumentsSigned = await prisma.document.count({
    where: {
      status: "SIGNED",
      ...dateFilter,
    },
  });

  // You might want to add more sophisticated queries for earnings based on date range
  // const totalEarned = await prisma.subscription.aggregate({
  //   where: dateFilter,
  //   _sum: { amount: true }
  // });

  res.json({
    success: true,
    data: {
      totalUsers,
      subscriptions: 0, // Fixed typo from "subcriptions"
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
