import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} from "../lib/cloudinary.js";

// @desc    Get template categories with counts
// @route   GET /api/templates/categories
// @access  Public
export const getTemplateCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await prisma.template.groupBy({
      by: ["category"],
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: "desc",
        },
      },
    });

    // Format categories for frontend
    const formattedCategories = categories.map((item) => ({
      category: item.category,
      count: item._count.category,
      label: item.category
        .replace("_", " ")
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    }));

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    throw new ApiError("Failed to fetch categories", 500);
  }
});

// @desc    Create new template
// @route   POST /api/templates
// @access  Private (Admin only)
export const createTemplate = asyncHandler(async (req, res) => {
  const { name, description, category } = req.body;

  if (!name || !category) {
    throw new ApiError("Name and category are required", 400);
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
        category: category.toUpperCase(),
        fileUrl: cloudinaryResult.url,
        publicId: cloudinaryResult.public_id,
        fileSize: req.file.size,
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
  const { name, description, category } = req.body;

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
      ...(description && { description }),
      ...(category && { category: category.toUpperCase() }),
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
      updateData.fileSize = req.file.size;
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

// @desc    Use template - increment usage count and return template data
// @route   POST /api/templates/:id/use
// @access  Private
export const useTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new ApiError("Template not found", 404);
    }

    // Increment usage count
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Template ready for use",
      data: {
        templateId: updatedTemplate.id,
        name: updatedTemplate.name,
        fileUrl: updatedTemplate.fileUrl,
        publicId: updatedTemplate.publicId,
        description: updatedTemplate.description,
        usageCount: updatedTemplate.usageCount,
      },
    });
  } catch (error) {
    console.error("Use template error:", error);
    throw new ApiError("Failed to use template", 500);
  }
});

// @desc    Get template statistics
// @route   GET /api/templates/stats
// @access  Private (Admin only)
export const getTemplateStats = asyncHandler(async (req, res) => {
  try {
    const [totalTemplates, totalUsage, categoryStats, topTemplates] =
      await Promise.all([
        // Total number of templates
        prisma.template.count(),

        // Total usage across all templates
        prisma.template.aggregate({
          _sum: {
            usageCount: true,
          },
        }),

        // Usage by category
        prisma.template.groupBy({
          by: ["category"],
          _sum: {
            usageCount: true,
          },
          _count: {
            category: true,
          },
        }),

        // Top 5 most used templates
        prisma.template.findMany({
          select: {
            id: true,
            name: true,
            category: true,
            usageCount: true,
          },
          orderBy: {
            usageCount: "desc",
          },
          take: 5,
        }),
      ]);

    res.status(200).json({
      success: true,
      message: "Template statistics retrieved successfully",
      data: {
        totalTemplates,
        totalUsage: totalUsage._sum.usageCount || 0,
        categoryStats,
        topTemplates,
      },
    });
  } catch (error) {
    console.error("Get template stats error:", error);
    throw new ApiError("Failed to fetch template statistics", 500);
  }
});
