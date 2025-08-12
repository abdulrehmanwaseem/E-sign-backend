import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/cloudinary.js";
import {
  sendCompletionNotification,
  sendSigningInvitation,
} from "../lib/emailService.js";
import { ApiError } from "../utils/ApiError.js";
import { createSignedPDF } from "../utils/pdfUtils.js";

// @desc    Get user's document library
// @route   GET /api/dashboard/documents/library
// @access  Private
export const getUserLibrary = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const documents = await prisma.document.findMany({
    where: {
      createdById: userId,
      isLibraryFile: true,
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      filePath: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json({
    success: true,
    message: "Documents retrieved successfully",
    data: documents,
  });
});

// @desc    Check if file exists by name for current user
// @route   GET /api/dashboard/documents/check-exists?fileName=filename.pdf
// @access  Private
export const checkFileExists = asyncHandler(async (req, res) => {
  const { fileName } = req.query;
  const userId = req.user.id;

  if (!fileName) {
    throw new ApiError("File name is required", 400);
  }

  const existingFile = await prisma.document.findFirst({
    where: {
      fileName: fileName,
      createdById: userId,
      isLibraryFile: true,
    },
    select: {
      id: true,
      name: true,
      fileName: true,
      filePath: true,
      publicId: true,
      fileType: true,
      extension: true,
    },
  });

  if (existingFile) {
    return res.status(200).json({
      success: true,
      exists: true,
      data: existingFile,
      message: `File "${fileName}" already exists in your library`,
    });
  }

  res.status(200).json({
    success: true,
    exists: false,
    message: "File does not exist",
  });
});

// @desc    Delete document from library
// @route   DELETE /api/dashboard/documents/library/:id
// @access  Private
export const deleteDocumentFromLibrary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const document = await prisma.document.findFirst({
    where: {
      id: id,
      createdById: userId,
    },
  });

  if (!document) {
    throw new ApiError("Document not found", 404);
  }

  // Delete file from Cloudinary
  try {
    if (document.publicId) {
      await deleteFileFromCloudinary(document.publicId);
    }
  } catch (error) {
    console.error("Failed to delete file from Cloudinary:", error);
    // Continue with database deletion even if Cloudinary deletion fails
  }

  // Delete document from database
  await prisma.document.delete({
    where: {
      id: id,
    },
  });

  res.status(200).json({
    success: true,
    message: "Document deleted successfully",
  });
});

// @desc    Create document and send for signing (Combined flow)
// @route   POST /api/dashboard/documents/send-for-signing
// @access  Private
export const createAndSendDocument = asyncHandler(async (req, res) => {
  const recipient = JSON.parse(req.body.recipient);
  const signatureFields = JSON.parse(req.body.signatureFields);

  const {
    name,
    fileType = "pdf",
    existingFileUrl,
    existingPublicId,
    existingFileName,
  } = req.body;
  const createdById = req.user.id;

  if (!recipient || !signatureFields || signatureFields.length === 0) {
    throw new ApiError("Recipient and signature fields are required", 400);
  }

  if (!name || !fileType) {
    throw new ApiError("Document name and file type are required", 400);
  }

  try {
    let cloudinaryResult = null;

    if (!existingFileUrl) {
      if (!req.file) throw new ApiError("File is required", 400);

      cloudinaryResult = await uploadFileToCloudinary(req.file);
    } else {
      // Use existing uploaded file
      cloudinaryResult = {
        url: existingFileUrl,
        public_id: existingPublicId || null,
        extension: fileType, // or extract from URL
      };
    }

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
    let document;
    if (existingFileUrl) {
      // Create a new document, linked to the library source
      document = await prisma.document.create({
        data: {
          name,
          fileName: existingFileName,
          fileType,
          filePath: existingFileUrl,
          publicId: existingPublicId,
          extension: fileType,
          accessToken: crypto.randomUUID(),
          createdById,
          recipientId: documentRecipient.id,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isLibraryFile: false,
        },
        include: { recipient: true, createdBy: true },
      });
    } else {
      // Fresh upload that goes into library
      document = await prisma.document.create({
        data: {
          name,
          fileName: req.file.originalname,
          fileType,
          filePath: cloudinaryResult.url,
          publicId: cloudinaryResult.public_id,
          extension: cloudinaryResult.extension,
          accessToken: crypto.randomUUID(),
          createdById,
          recipientId: documentRecipient.id,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isLibraryFile: true,
        },
        include: { recipient: true, createdBy: true },
      });
    }
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
            fileName: existingFileName || req.file?.originalname,
            fileSize: req.file?.size,
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
// @route   GET /api/dashboard/documents
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
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          signedPdfUrl: true,
          recipient: {
            select: {
              name: true,
              email: true,
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
// @route   GET /api/dashboard/documents/:id
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
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        signedAt: true,
        signedPdfUrl: true,
        filePath: true,
        fileType: true,
        recipient: {
          select: {
            name: true,
            email: true,
          },
        },
        fields: {
          select: { id: true }, // only need length in frontend
        },
      },
    });

    if (!document) {
      throw new ApiError("Document not found", 404);
    }

    // Map DB fieldPath → fileUrl for frontend
    res.status(200).json({
      success: true,
      data: {
        ...document,
        fileUrl: document.filePath,
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    throw new ApiError("Failed to fetch document", 500);
  }
});

// @desc    Get document for signing (public access with token)
// @route   GET /api/dashboard/documents/sign/:accessToken
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
// @route   POST /api/dashboard/documents/sign/:accessToken/submit
// @access  Public
export const submitSignature = asyncHandler(async (req, res, next) => {
  const { accessToken } = req.params;
  const { signatureData } = req.body;

  console.log("=== Starting signature submission ===");
  console.log("Access token:", accessToken);
  console.log("Signature data count:", signatureData?.length);

  try {
    // Find document by its own access token
    const document = await prisma.document.findUnique({
      where: { accessToken },
      include: {
        recipient: true,
        fields: true,
        createdBy: true, // Include sender information for email notification
      },
    });

    if (!document) {
      throw new ApiError("Document not found or access denied", 404);
    }

    console.log("Document found:", document.id, document.name);
    console.log("Document fields count:", document.fields.length);
    console.log("Document publicId:", document.publicId);

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

    // Create signed PDF with embedded signatures
    let signedPdfUrl = null;
    console.log("=== Starting PDF creation ===");
    try {
      signedPdfUrl = await createSignedPDF(document, signatureData);
      console.log("=== PDF creation successful ===");
      console.log("Signed PDF URL:", signedPdfUrl);
    } catch (pdfError) {
      console.error("=== PDF creation failed ===");
      console.error("PDF creation error:", pdfError);
      // Continue without signed PDF if creation fails
    }

    // Update document with signing info and status
    await Promise.all([
      prisma.document.update({
        where: { id: document.id },
        data: {
          status: "SIGNED",
          signedAt: new Date(),
          signedPdfUrl: signedPdfUrl, // Store the signed PDF URL
        },
      }),
    ]);

    // Log activities for signing process
    await Promise.all([
      // Log SIGNED activity
      prisma.documentActivity.create({
        data: {
          documentId: document.id,
          recipientId: document.recipientId,
          action: "SIGNED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          details: {
            fieldsCount: signatureData.length,
            signedPdfCreated: !!signedPdfUrl,
          },
        },
      }),
      // Log COMPLETED activity (signing process completed)
      prisma.documentActivity.create({
        data: {
          documentId: document.id,
          recipientId: document.recipientId,
          action: "COMPLETED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          details: {
            action: "signing_process_completed",
            signedPdfUrl: signedPdfUrl,
            completedBy: document.recipient.email,
          },
        },
      }),
    ]);

    // Send completion notification to document sender
    try {
      await sendCompletionNotification(
        document.createdBy,
        {
          ...document,
          signedAt: new Date(),
        },
        document.recipient
      );
    } catch (emailError) {
      console.error("Failed to send completion notification:", emailError);
      // Don't fail the signing process if email fails
    }

    res.status(200).json({
      success: true,
      message: "Document signed successfully",
      data: {
        signedAt: new Date(),
        signedPdfUrl: signedPdfUrl,
      },
    });
  } catch (error) {
    console.error("Submit signature error:", error);
    throw new ApiError("Failed to submit signature", 500);
  }
});

// @desc    Get document audit trail
// @route   GET /api/dashboard/documents/:id/audit-trail
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
// @route   DELETE /api/dashboard/documents/:id
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

// @desc    Cancel document
// @route   PATCH /api/dashboard/documents/:id/cancel
// @access  Private
export const cancelDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdById = req.user.id;
  console.log("TESTTT", req.params);
  try {
    // Find the document first to ensure it belongs to user and can be cancelled
    const document = await prisma.document.findFirst({
      where: {
        id,
        createdById, // Ensure user can only cancel their own documents
      },
    });

    if (!document) {
      throw new ApiError("Document not found or access denied", 404);
    }

    // Check if document can be cancelled (only PENDING documents can be cancelled)
    if (document.status !== "PENDING") {
      throw new ApiError(
        `Cannot cancel document with status: ${document.status}`,
        400
      );
    }

    // Update document status to CANCELLED
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    // Log activity for cancellation
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        action: "CANCELLED",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          cancelledBy: req.user.email,
          reason: "Document cancelled by sender",
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Document cancelled successfully",
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Cancel document error:", error);
    throw new ApiError("Failed to cancel document", 400);
  }
});

// @desc    Get all templates
// @route   GET /api/dashboard/templates
// @access  Public
export const getTemplates = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 8 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    ...(category && { category: category.toUpperCase() }),
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
          category: true,
          fileUrl: true,
          publicId: true,
          fileSize: true,
          usageCount: true,
          createdAt: true,
        },
        orderBy: [
          { usageCount: "desc" }, // Most used first
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
