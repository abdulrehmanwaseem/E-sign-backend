import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
export const getTemplates = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 8 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  try {
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          fileUrl: true,
          publicId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { createdAt: "desc" }, // Newest first
        ],
        skip,
        take,
      }),
      prisma.template.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "Templates retrieved successfully",
      data: {
        templates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / take),
          totalCount: total,
          hasNextPage: skip + take < total,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get templates error:", error);
    throw new ApiError("Failed to fetch templates", 500);
  }
});

// @desc    Create new template
// @route   POST /api/templates
// @access  Private (Admin only)
export const createTemplate = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError("Name is required", 400);
  }

  if (!req.file) {
    throw new ApiError("Template file is required", 400);
  }

  try {
    // Upload file to Cloudinary
    const cloudinaryResult = await uploadFileToCloudinary(req.file);

    // Create template in database
    const template = await prisma.template.create({
      data: {
        name,
        description,
        fileUrl: cloudinaryResult.url,
        publicId: cloudinaryResult.public_id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    console.error("Create template error:", error);
    throw new ApiError("Failed to create template", 500);
  }
});

// @desc    Update template
// @route   PUT /api/templates/:id
// @access  Private (Admin only)
export const updateTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      throw new ApiError("Template not found", 404);
    }

    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    };

    // Handle file update if new file is provided
    if (req.file) {
      // Delete old file from Cloudinary
      if (existingTemplate.publicId) {
        await deleteFileFromCloudinary(existingTemplate.publicId);
      }

      // Upload new file
      const cloudinaryResult = await uploadFileToCloudinary(req.file);
      updateData.fileUrl = cloudinaryResult.url;
      updateData.publicId = cloudinaryResult.public_id;
    }

    // Update template
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    console.error("Update template error:", error);
    throw new ApiError("Failed to update template", 500);
  }
});

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private (Admin only)
export const deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new ApiError("Template not found", 404);
    }

    // Delete file from Cloudinary
    if (template.publicId) {
      try {
        await deleteFileFromCloudinary(template.publicId);
      } catch (cloudinaryError) {
        console.warn("Failed to delete file from Cloudinary:", cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete template from database
    await prisma.template.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete template error:", error);
    throw new ApiError("Failed to delete template", 500);
  }
});

// @desc    Get template statistics
// @route   GET /api/templates/stats
// @access  Private (Admin only)
export const getTemplateStats = asyncHandler(async (req, res) => {
  try {
    const [totalTemplates, recentTemplates] = await Promise.all([
      // Total number of templates
      prisma.template.count(),

      // Recent templates (last 3)
      prisma.template.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          fileUrl: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Template statistics retrieved successfully",
      data: {
        totalTemplates,
        recentTemplates,
      },
    });
  } catch (error) {
    console.error("Get template stats error:", error);
    throw new ApiError("Failed to fetch template statistics", 500);
  }
});
