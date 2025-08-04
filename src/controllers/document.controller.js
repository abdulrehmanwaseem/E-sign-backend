import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSigningInvitation } from "../lib/emailService.js";

// @desc    Create document and send for signing (Combined flow)
// @route   POST /api/documents/send-for-signing
// @access  Private
export const createAndSendDocument = asyncHandler(async (req, res) => {
  const recipient = JSON.parse(req.body.recipient);
  const signatureFields = JSON.parse(req.body.signatureFields);

  const { name, fileType } = req.body;
  const createdById = req.user.id;

  if (!req.file) {
    throw new ApiError("File is required", 400);
  }

  if (!recipient || !signatureFields || signatureFields.length === 0) {
    throw new ApiError("Recipient and signature fields are required", 400);
  }

  if (!name || !fileType) {
    throw new ApiError("Document name and file type are required", 400);
  }

  try {
    // Step 1: Upload file to Cloudinary
    const cloudinaryResult = await uploadFileToCloudinary(req.file);

    console.log("Cloudinary upload result:", cloudinaryResult); // Debug log

    // Step 2: Create or find recipient
    let documentRecipient = await prisma.documentRecipient.findFirst({
      where: {
        email: recipient.email.toLowerCase(),
        name: recipient.name,
      },
    });

    if (!documentRecipient) {
      documentRecipient = await prisma.documentRecipient.create({
        data: {
          name: recipient.name,
          email: recipient.email.toLowerCase(),
          phone: recipient.phone || null,
          accessToken: crypto.randomUUID(),
        },
      });
    }

    // Step 3: Create document in database
    const document = await prisma.document.create({
      data: {
        name,
        fileName: req.file.originalname,
        fileType,
        filePath: cloudinaryResult.url, // Store Cloudinary URL
        publicId: cloudinaryResult.public_id, // Store public_id for deletion
        extension: cloudinaryResult.extension, // Store file extension
        accessToken: crypto.randomUUID(), // Generate unique access token for document
        createdById,
        recipientId: documentRecipient.id,
        status: "PENDING", // Use PENDING status, SENT is an activity action
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      include: {
        recipient: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Step 4: Create signature fields
    const fieldsData = signatureFields.map((field) => ({
      documentId: document.id,
      recipientId: documentRecipient.id,
      fieldId: field.id,
      fieldType: field.type.toUpperCase(),
      pageNumber: field.page,
      xPosition: field.x,
      yPosition: field.y,
      width: field.width,
      height: field.height,
    }));

    await prisma.signatureField.createMany({
      data: fieldsData,
    });

    // Step 5: Log activities
    await Promise.all([
      // Document created activity
      prisma.documentActivity.create({
        data: {
          documentId: document.id,
          action: "CREATED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          details: {
            fileName: req.file.originalname,
            fileSize: req.file.size,
          },
        },
      }),
      // Document sent activity
      prisma.documentActivity.create({
        data: {
          documentId: document.id,
          recipientId: documentRecipient.id,
          action: "SENT",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          details: {
            recipientEmail: recipient.email,
            fieldsCount: signatureFields.length,
          },
        },
      }),
    ]);

    // Step 6: Send email notification to recipient
    try {
      await sendSigningInvitation(documentRecipient, document, req.user);
      console.log("Signing invitation email sent successfully");
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't throw error - document creation was successful, email is just a notification
    }

    res.status(201).json({
      success: true,
      message: "Document created and sent for signing successfully",
      data: {
        signingUrl: `${process.env.CLIENT_URL}/signing/${document.accessToken}`,
      },
    });
  } catch (error) {
    console.error("Create and send document error:", error);
    throw new ApiError("Failed to create and send document", 500);
  }
});

// @desc    Get all documents for user
// @route   GET /api/documents
// @access  Private
export const getDocuments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const createdById = req.user.id;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    createdById,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  try {
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              signedAt: true,
              viewedAt: true,
            },
          },
          fields: {
            select: {
              id: true,
              fieldType: true,
              fieldValue: true,
            },
          },
          _count: {
            select: {
              fields: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.document.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        documents,
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
    console.error("Get documents error:", error);
    throw new ApiError("Failed to fetch documents", 500);
  }
});

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdById = req.user.id;

  try {
    const document = await prisma.document.findFirst({
      where: {
        id,
        createdById,
      },
      include: {
        recipient: true,
        fields: {
          orderBy: [{ pageNumber: "asc" }, { yPosition: "asc" }],
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new ApiError("Document not found", 404);
    }

    // File URL is already complete for Cloudinary uploads
    const fileUrl = document.filePath;

    res.status(200).json({
      success: true,
      data: {
        ...document,
        fileUrl,
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    throw new ApiError("Failed to fetch document", 500);
  }
});

// @desc    Get document for signing (public access with token)
// @route   GET /api/documents/sign/:accessToken
// @access  Public
export const getDocumentForSigning = asyncHandler(async (req, res) => {
  const { accessToken } = req.params;

  try {
    // Find document by its own access token
    const document = await prisma.document.findUnique({
      where: { accessToken },
      include: {
        recipient: true,
        fields: {
          orderBy: [{ pageNumber: "asc" }, { yPosition: "asc" }],
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new ApiError("Document not found or access denied", 404);
    }

    // Check if document is expired
    if (document.expiresAt && new Date() > document.expiresAt) {
      throw new ApiError("Document has expired", 410);
    }

    // Update viewed status if not already viewed
    if (!document.recipient.viewedAt) {
      await prisma.documentRecipient.update({
        where: { id: document.recipient.id },
        data: { viewedAt: new Date() },
      });

      // Log activity
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          recipientId: document.recipient.id,
          action: "VIEWED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });
    }

    // File URL is already complete for Cloudinary uploads
    const fileUrl = document.filePath;

    res.status(200).json({
      success: true,
      data: {
        document: {
          ...document,
          fileUrl,
        },
        recipient: {
          id: document.recipient.id,
          name: document.recipient.name,
          email: document.recipient.email,
        },
      },
    });
  } catch (error) {
    console.error("Get document for signing error:", error);
    throw new ApiError("Failed to fetch document for signing", 500);
  }
});

// @desc    Submit signature
// @route   POST /api/documents/sign/:accessToken/submit
// @access  Public
export const submitSignature = asyncHandler(async (req, res, next) => {
  const { accessToken } = req.params;
  const { signatureData } = req.body;

  try {
    // Find document by its own access token
    const document = await prisma.document.findUnique({
      where: { accessToken },
      include: {
        recipient: true,
      },
    });

    if (!document) {
      throw new ApiError("Document not found or access denied", 404);
    }

    // Check if already signed
    if (document.signedAt) {
      throw new ApiError("Document has already been signed", 400);
    }

    // Check if document is expired
    if (document.expiresAt && new Date() > document.expiresAt) {
      throw new ApiError("Document has expired", 410);
    }

    // Update signature fields with values
    const updatePromises = signatureData.map((fieldData) =>
      prisma.signatureField.update({
        where: {
          id: fieldData.fieldId,
        },
        data: {
          fieldValue: fieldData.value,
        },
      })
    );

    await Promise.all(updatePromises);

    // Update document with signing info and status
    await Promise.all([
      prisma.document.update({
        where: { id: document.id },
        data: {
          status: "SIGNED",
          signedAt: new Date(),
        },
      }),
    ]);

    // Log activity
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        recipientId: document.recipientId,
        action: "SIGNED",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          fieldsCount: signatureData.length,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Document signed successfully",
      data: {
        signedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Submit signature error:", error);
    throw new ApiError("Failed to submit signature", 500);
  }
});

// @desc    Get document audit trail
// @route   GET /api/documents/:id/audit-trail
// @access  Private
export const getDocumentAuditTrail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdById = req.user.id;

  try {
    // Check if document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id,
        createdById,
      },
    });

    if (!document) {
      throw new ApiError("Document not found", 404);
    }

    const activities = await prisma.documentActivity.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get audit trail error:", error);
    throw new ApiError("Failed to fetch audit trail", 500);
  }
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdById = req.user.id;

  try {
    // Find the document first to get cloudinary info
    const document = await prisma.document.findFirst({
      where: {
        id,
        createdById, // Ensure user can only delete their own documents
      },
    });

    if (!document) {
      throw new ApiError("Document not found or access denied", 404);
    }

    // Delete file from Cloudinary if it exists
    if (document.publicId) {
      try {
        const ext = document.fileName.split(".").pop().toLowerCase();
        const resource_type = ["pdf", "doc", "docx"].includes(ext)
          ? "raw"
          : "image";
        await deleteFileFromCloudinary(document.publicId, resource_type);
      } catch (cloudinaryError) {
        console.warn("Cloudinary deletion warning:", cloudinaryError.message);
        // Continue with database deletion even if cloudinary deletion fails
      }
    }

    // Delete document from database (this will cascade delete related records)
    await prisma.document.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    throw new ApiError("Failed to delete document", 500);
  }
});
