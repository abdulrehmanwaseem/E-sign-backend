import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get dashboard statistics and recent uploads
// @route   GET /api/dashboard
// @access  Private
export const getDashboardData = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  try {
    const [
      pendingSignatures,
      completeSignatures,
      cancelledSignatures,
      uploadedDocuments,
      totalDocuments,
      recentUploads,
    ] = await Promise.all([
      prisma.document.count({
        where: {
          createdById: userId,
          status: "PENDING",
        },
      }),

      prisma.document.count({
        where: {
          createdById: userId,
          status: "SIGNED",
        },
      }),

      prisma.document.count({
        where: {
          createdById: userId,
          status: "CANCELLED",
        },
      }),

      prisma.document.count({
        where: {
          createdById: userId,
          isLibraryFile: true,
        },
      }),

      prisma.document.count({
        where: {
          createdById: userId,
        },
      }),

      prisma.document.findMany({
        where: {
          createdById: userId,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          status: true,
          _count: {
            select: {
              fields: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
    ]);

    // Calculate metrics
    const completionRate =
      totalDocuments > 0
        ? Math.round((completeSignatures / totalDocuments) * 100)
        : 0;

    const failureRate =
      totalDocuments > 0
        ? Math.round((cancelledSignatures / totalDocuments) * 100)
        : 0;

    res.status(200).json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: {
        statistics: {
          pendingSignatures,
          completeSignatures,
          cancelledSignatures,
          uploadedDocuments,
          totalDocuments,
          completionRate,
          failureRate,
        },
        recentUploads,
      },
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    return next(new ApiError("Failed to fetch dashboard data", 500));
  }
});
