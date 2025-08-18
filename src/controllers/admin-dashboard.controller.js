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
      userType: "Free User",
      documentSignedAt: "12:13 AM",
      documentSentCount: user._count.documents,
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

export const getUser = asyncHandler(async (req, res, next) => {
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
    return next(new ApiError(404, "User not found"));
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
      slug: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
      canonicalUrl: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: blogs });
});

export const createBlog = asyncHandler(async (req, res, next) => {
  const { title, slug, content, metaTitle, metaDescription, canonicalUrl } =
    req.body;

  // Validate required fields
  if (!title?.trim() || !content?.trim()) {
    return next(new ApiError(400, "Title and content are required"));
  }
  if (!req.file) {
    return next(new ApiError(400, "Image file is required"));
  }

  // Generate slug if not provided
  const blogSlug =
    slug?.trim() ||
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Check if slug already exists
  const existingBlog = await prisma.blog.findUnique({
    where: { slug: blogSlug },
  });

  if (existingBlog) {
    return next(new ApiError(400, "A blog with this slug already exists"));
  }

  try {
    const uploadResult = await uploadFileToCloudinary(req.file);

    if (!uploadResult?.url) {
      return next(new ApiError(500, "Failed to upload image"));
    }

    const blog = await prisma.blog.create({
      data: {
        title: title.trim(),
        slug: blogSlug,
        content: content.trim(),
        metaTitle: metaTitle?.trim() || title.trim(),
        metaDescription: metaDescription?.trim(),
        canonicalUrl: canonicalUrl?.trim(),
        image: uploadResult.url,
        imagePublicId: uploadResult.public_id,
      },
    });

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error("Error creating blog:", error);
    return next(new ApiError(500, "Failed to create blog"));
  }
});

export const updateBlog = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, slug, content, metaTitle, metaDescription, canonicalUrl } =
    req.body;

  // Check if blog exists
  const existingBlog = await prisma.blog.findUnique({
    where: { id },
  });

  if (!existingBlog) {
    return next(new ApiError(404, "Blog not found"));
  }

  // If slug is being updated, check for conflicts
  if (slug && slug.trim() !== existingBlog.slug) {
    const slugConflict = await prisma.blog.findUnique({
      where: { slug: slug.trim() },
    });

    if (slugConflict) {
      return next(new ApiError(400, "A blog with this slug already exists"));
    }
  }

  let imageUrl = existingBlog.image;
  let imagePublicId = existingBlog.imagePublicId;

  // Handle image upload if new file provided
  if (req.file) {
    try {
      const uploadResult = await uploadFileToCloudinary(req.file);

      if (!uploadResult?.url) {
        return next(new ApiError(500, "Failed to upload new image"));
      }

      // Delete old image from Cloudinary
      if (existingBlog.imagePublicId) {
        try {
          await deleteFileFromCloudinary(existingBlog.imagePublicId, "image");
        } catch (err) {
          console.error(
            "Failed to delete old image from Cloudinary:",
            err.message
          );
          // Continue with update even if old image deletion fails
        }
      }

      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.public_id;
    } catch (error) {
      console.error("Error uploading image:", error);
      return next(new ApiError(500, "Failed to upload image"));
    }
  }

  const updateData = {
    image: imageUrl,
    imagePublicId,
    updatedAt: new Date(),
  };

  // Only update fields that are provided and not empty
  if (title?.trim()) updateData.title = title.trim();
  if (slug?.trim()) updateData.slug = slug.trim();
  if (content?.trim()) updateData.content = content.trim();
  if (metaTitle?.trim()) updateData.metaTitle = metaTitle.trim();
  if (metaDescription?.trim())
    updateData.metaDescription = metaDescription.trim();
  if (canonicalUrl?.trim()) updateData.canonicalUrl = canonicalUrl.trim();

  try {
    const blog = await prisma.blog.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: blog });
  } catch (error) {
    console.error("Error updating blog:", error);
    return next(new ApiError(500, "Failed to update blog"));
  }
});

export const deleteBlog = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Check if blog exists
  const existingBlog = await prisma.blog.findUnique({
    where: { id },
  });

  if (!existingBlog) {
    return next(new ApiError(404, "Blog not found"));
  }

  try {
    // Delete image from Cloudinary if present
    if (existingBlog.imagePublicId) {
      try {
        await deleteFileFromCloudinary(existingBlog.imagePublicId, "image");
      } catch (err) {
        console.error("Failed to delete image from Cloudinary:", err.message);
        // Continue with deletion even if image deletion fails
      }
    }

    await prisma.blog.delete({ where: { id } });
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return next(new ApiError(500, "Failed to delete blog"));
  }
});

export const getBlogBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
  });

  if (!blog) {
    return next(new ApiError(404, "Blog not found"));
  }

  res.json({ success: true, data: blog });
});
