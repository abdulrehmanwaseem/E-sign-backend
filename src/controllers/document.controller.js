import asyncHandler from "express-async-handler";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { validationResult } from "express-validator";
import { prisma } from "../config/dbConnection.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Create document and send for signing (Combined flow)
// @route   POST /api/documents/send-for-signing
// @access  Private
export const createAndSendDocument = asyncHandler(async (req, res) => {
  console.log("Raw request body:", req.body);
  console.log("Request file:", req.file);

  // Parse JSON strings from FormData
  let recipient, signatureFields;
  try {
    recipient =
      typeof req.body.recipient === "string"
        ? JSON.parse(req.body.recipient)
        : req.body.recipient;
    signatureFields =
      typeof req.body.signatureFields === "string"
        ? JSON.parse(req.body.signatureFields)
        : req.body.signatureFields;
  } catch (parseError) {
    console.error("JSON parsing error:", parseError);
    throw new ApiError(
      "Invalid JSON data in recipient or signatureFields",
      400
    );
  }

  console.log("Parsed recipient:", recipient);
  console.log("Parsed signatureFields:", signatureFields);

  const { name, fileType } = req.body;
  const createdById = req.user.id;

  if (!req.file) {
    throw new ApiError("File is required", 400);
  }

  if (!recipient || !signatureFields || signatureFields.length === 0) {
    throw new ApiError("Recipient and signature fields are required", 400);
  }

  // Basic validation
  if (!recipient.name || !recipient.email) {
    throw new ApiError("Recipient name and email are required", 400);
  }

  if (!name || !fileType) {
    throw new ApiError("Document name and file type are required", 400);
  }

  try {
    // Step 1: Handle file upload and storage
    const fileName = `${Date.now()}-${crypto.randomUUID()}${path.extname(
      req.file.originalname
    )}`;
    const uploadPath = path.join(
      process.cwd(),
      "uploads",
      "documents",
      fileName
    );

    // Ensure directory exists
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });

    // Move file from temp to documents directory
    await fs.rename(req.file.path, uploadPath);

    const filePath = `uploads/documents/${fileName}`;
    const fileUrl = `${req.protocol}://${req.get("host")}/${filePath}`;

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
        filePath,
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

    // Step 6: TODO - Send email notification to recipient
    // await sendSigningInvitation(documentRecipient, document);

    res.status(201).json({
      success: true,
      message: "Document created and sent for signing successfully",
      data: {
        document: {
          ...document,
          fileUrl,
        },
        recipient: documentRecipient,
        signingUrl: `${process.env.CLIENT_URL}/sign/${documentRecipient.accessToken}`,
        fieldsCount: signatureFields.length,
      },
    });
  } catch (error) {
    console.error("Create and send document error:", error);

    // Clean up uploaded file if database operations failed
    try {
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path);
      }
    } catch (cleanupError) {
      console.warn("File cleanup warning:", cleanupError.message);
    }

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
      throw new ApiError(404, "Document not found");
    }

    // Generate file URL if needed
    let fileUrl = document.filePath;
    if (!document.filePath.startsWith("http")) {
      fileUrl = `${req.protocol}://${req.get("host")}/${document.filePath}`;
    }

    res.status(200).json({
      success: true,
      data: {
        ...document,
        fileUrl,
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    throw new ApiError(500, "Failed to fetch document");
  }
});

// @desc    Get document for signing (public access with token)
// @route   GET /api/documents/sign/:accessToken
// @access  Public
export const getDocumentForSigning = asyncHandler(async (req, res) => {
  const { accessToken } = req.params;

  try {
    const recipient = await prisma.documentRecipient.findUnique({
      where: { accessToken },
      include: {
        documents: {
          include: {
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
        },
      },
    });

    if (!recipient || !recipient.documents.length) {
      throw new ApiError(404, "Document not found or access denied");
    }

    const document = recipient.documents[0]; // Get the first document

    // Check if document is expired
    if (document.expiresAt && new Date() > document.expiresAt) {
      throw new ApiError(410, "Document has expired");
    }

    // Update viewed status if not already viewed
    if (!recipient.viewedAt) {
      await prisma.documentRecipient.update({
        where: { id: recipient.id },
        data: { viewedAt: new Date() },
      });

      // Log activity
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          recipientId: recipient.id,
          action: "VIEWED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });
    }

    // Generate file URL
    let fileUrl = document.filePath;
    if (!document.filePath.startsWith("http")) {
      fileUrl = `${req.protocol}://${req.get("host")}/${document.filePath}`;
    }

    res.status(200).json({
      success: true,
      data: {
        document: {
          ...document,
          fileUrl,
        },
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
        },
      },
    });
  } catch (error) {
    console.error("Get document for signing error:", error);
    throw new ApiError(500, "Failed to fetch document for signing");
  }
});

// @desc    Submit signature
// @route   POST /api/documents/sign/:accessToken/submit
// @access  Public
export const submitSignature = asyncHandler(async (req, res) => {
  const { accessToken } = req.params;
  const { signatureData } = req.body;

  try {
    const recipient = await prisma.documentRecipient.findUnique({
      where: { accessToken },
      include: {
        documents: true,
      },
    });

    if (!recipient || !recipient.documents.length) {
      throw new ApiError(404, "Document not found or access denied");
    }

    const document = recipient.documents[0];

    // Check if already signed
    if (recipient.signedAt) {
      throw new ApiError(400, "Document has already been signed");
    }

    // Check if document is expired
    if (document.expiresAt && new Date() > document.expiresAt) {
      throw new ApiError(410, "Document has expired");
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

    // Update recipient and document status
    await Promise.all([
      prisma.documentRecipient.update({
        where: { id: recipient.id },
        data: { signedAt: new Date() },
      }),
      prisma.document.update({
        where: { id: document.id },
        data: { status: "SIGNED" },
      }),
    ]);

    // Log activity
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        recipientId: recipient.id,
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
    throw new ApiError(500, "Failed to submit signature");
  }
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdById = req.user.id;

  try {
    const document = await prisma.document.findFirst({
      where: {
        id,
        createdById,
      },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    // Delete file from storage
    if (!document.filePath.startsWith("http")) {
      try {
        await fs.unlink(path.join(process.cwd(), document.filePath));
      } catch (error) {
        console.warn("File deletion warning:", error.message);
      }
    }

    // Delete document (cascade will handle related records)
    await prisma.document.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    throw new ApiError(500, "Failed to delete document");
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
      throw new ApiError(404, "Document not found");
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
    throw new ApiError(500, "Failed to fetch audit trail");
  }
});
