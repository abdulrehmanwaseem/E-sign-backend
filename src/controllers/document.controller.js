import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { prisma } from "../config/dbConnection.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../lib/cloudinary.js";
import {
  sendCompletionNotification,
  sendDocumentOpenedNotification,
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

// @desc    Create document and send for signing (Multi-recipient)
// @route   POST /api/dashboard/documents/send-for-signing
// @access  Private
export const createAndSendDocument = asyncHandler(async (req, res) => {
  const recipients = JSON.parse(req.body.recipients); // Array of recipients
  const signatureFields = JSON.parse(req.body.signatureFields); // Each field has recipientEmail

  const {
    name,
    fileType = "pdf",
    existingFileUrl,
    existingPublicId,
    existingFileName,
    customRecipientMessage,
  } = req.body;
  const createdById = req.user.id;

  if (!recipients || recipients.length === 0) {
    throw new ApiError("Recipients are required", 400);
  }

  if (!signatureFields || signatureFields.length === 0) {
    throw new ApiError("Signature fields are required", 400);
  }

  try {
    // Handle file upload (same as before)
    let cloudinaryResult = null;
    if (!existingFileUrl) {
      if (!req.file) throw new ApiError("File is required", 400);
      cloudinaryResult = await uploadFileToCloudinary(req.file);
    } else {
      cloudinaryResult = {
        url: existingFileUrl,
        public_id: existingPublicId || null,
        extension: fileType,
      };
    }

    // Create document (same as before)
    let document;
    if (existingFileUrl) {
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
          status: "PENDING",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isLibraryFile: false,
          customRecipientMessage: customRecipientMessage || null,
        },
      });
    } else {
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
          status: "PENDING",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isLibraryFile: true,
          customRecipientMessage: customRecipientMessage || null,
        },
      });
    }

    // Create recipients for this document
    const createdRecipients = await Promise.all(
      recipients.map(async (recipient) => {
        return await prisma.documentRecipient.create({
          data: {
            documentId: document.id,
            name: recipient.name,
            email: recipient.email.toLowerCase(),
            phone: recipient.phone || null,
            accessToken: crypto.randomUUID(),
            status: "PENDING",
          },
        });
      })
    );

    // Create signature fields with recipient assignment
    const fieldsData = signatureFields.map((field) => {
      // Find the recipient for this field
      const recipient = createdRecipients.find(
        (r) => r.email === field.recipientEmail.toLowerCase()
      );

      if (!recipient) {
        throw new ApiError(
          `Recipient not found for field: ${field.recipientEmail}`,
          400
        );
      }

      return {
        documentId: document.id,
        recipientId: recipient.id,
        fieldId: field.id,
        fieldType: field.type.toUpperCase(),
        pageNumber: field.page,
        xPosition: field.x,
        yPosition: field.y,
        width: field.width,
        height: field.height,
      };
    });

    await prisma.signatureField.createMany({
      data: fieldsData,
    });

    if (
      req.user.userType !== "PRO" &&
      !req.user.isTemplatePicked &&
      !document?.isLibraryFile &&
      existingFileUrl &&
      existingPublicId
    ) {
      await prisma.user.update({
        where: { id: createdById },
        data: { isTemplatePicked: true },
      });
    }

    // Send emails to all recipients (parallel signing)
    const emailPromises = createdRecipients.map(async (recipient) => {
      try {
        await sendSigningInvitation(
          recipient,
          document,
          req.user,
          customRecipientMessage
        );

        // Log activity for each recipient
        await prisma.documentActivity.create({
          data: {
            documentId: document.id,
            recipientId: recipient.id,
            action: "SENT",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            details: {
              recipientEmail: recipient.email,
              totalRecipients: createdRecipients.length,
            },
          },
        });
      } catch (emailError) {
        console.error(
          `Failed to send email to ${recipient.email}:`,
          emailError
        );
      }
    });

    await Promise.allSettled(emailPromises);

    // Log document creation
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        action: "CREATED",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          fileName: existingFileName || req.file?.originalname,
          recipientCount: createdRecipients.length,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Document created and sent for signing successfully",
      data: {
        documentId: document.id,
        recipients: createdRecipients.map((r) => ({
          name: r.name,
          email: r.email,
          status: r.status,
          signingUrl: `${process.env.CLIENT_URL}/signing/${r.accessToken}`,
        })),
      },
    });
  } catch (error) {
    console.error("Create and send document error:", error);
    throw new ApiError("Failed to create and send document", 500);
  }
});

// @desc    Get all documents (updated to show recipient info)
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
          signedAt: true,
          signedPdfUrl: true,
          recipients: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              signedAt: true,
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

    // Add helpful info for frontend
    const enhancedDocuments = documents.map((doc) => ({
      ...doc,
      recipientCount: doc.recipients.length,
      signedCount: doc.recipients.filter((r) => r.status === "SIGNED").length,
      pendingRecipients: doc.recipients.filter((r) => r.status === "PENDING"),
    }));

    res.status(200).json({
      success: true,
      data: {
        documents: enhancedDocuments,
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
        expiresAt: true,
        signedPdfUrl: true,
        filePath: true,
        fileType: true,
        // new schema (multi recipients)
        recipients: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            viewedAt: true,
            signedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        fields: {
          select: { id: true }, // only need count on FE
        },
      },
    });

    if (!document) {
      throw new ApiError("Document not found", 404);
    }

    res.status(200).json({
      success: true,
      data: {
        ...document,
        fileUrl: document.filePath, // map filePath → fileUrl for FE
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    throw new ApiError("Failed to fetch document", 500);
  }
});

// @desc    Get document for signing (works with recipient's access token)
// @route   GET /api/dashboard/documents/sign/:accessToken
// @access  Public
export const getDocumentForSigning = asyncHandler(async (req, res) => {
  const { accessToken } = req.params;

  try {
    // Find recipient by their access token
    const recipient = await prisma.documentRecipient.findUnique({
      where: { accessToken },
      include: {
        document: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        fields: {
          orderBy: [{ pageNumber: "asc" }, { yPosition: "asc" }],
        },
      },
    });

    if (!recipient) {
      throw new ApiError("Document not found or access denied", 404);
    }

    const { document } = recipient;

    // Check if document is expired
    if (document.expiresAt && new Date() > document.expiresAt) {
      throw new ApiError("Document has expired", 410);
    }

    // Check if this recipient already signed
    if (recipient.status === "SIGNED") {
      throw new ApiError("You have already signed this document", 400);
    }

    // Update viewed status
    if (!recipient.viewedAt) {
      await prisma.documentRecipient.update({
        where: { id: recipient.id },
        data: { viewedAt: new Date() },
      });

      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          recipientId: recipient.id,
          action: "VIEWED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // 🔔 Send email to sender
      await sendDocumentOpenedNotification({
        senderEmail: document.createdBy.email,
        senderName: `${document.createdBy.firstName || "Not provided"} ${
          document.createdBy.lastName || ""
        }`,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        documentName: document.title,
        documentId: document.id,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        document: {
          ...document,
          fileUrl: document.filePath,
          fields: recipient.fields, // Only fields for this recipient
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
    throw new ApiError("Failed to fetch document for signing", 500);
  }
});

// Enhanced submitSignature function with better error handling and notifications
export const submitSignature = asyncHandler(async (req, res, next) => {
  const { accessToken } = req.params;
  const { signatureData } = req.body;

  try {
    // Find recipient by access token
    const recipient = await prisma.documentRecipient.findUnique({
      where: { accessToken },
      include: {
        document: {
          include: {
            createdBy: true,
            recipients: true,
          },
        },
      },
    });

    if (!recipient) {
      throw new ApiError("Document not found or access denied", 404);
    }

    const { document } = recipient;

    // Check if already signed
    if (recipient.status === "SIGNED") {
      throw new ApiError("You have already signed this document", 400);
    }

    // Update signature fields with values
    const updatePromises = signatureData.map((fieldData) =>
      prisma.signatureField.update({
        where: { id: fieldData.fieldId },
        data: { fieldValue: fieldData.value },
      })
    );
    await Promise.all(updatePromises);

    // Mark this recipient as signed
    await prisma.documentRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
      },
    });

    // Check if all recipients have signed
    const updatedRecipients = await prisma.documentRecipient.findMany({
      where: { documentId: document.id },
    });

    const allSigned = updatedRecipients.every((r) => r.status === "SIGNED");
    const someSigned = updatedRecipients.some((r) => r.status === "SIGNED");

    let documentStatus = "PENDING";
    if (allSigned) {
      documentStatus = "SIGNED";
    } else if (someSigned) {
      documentStatus = "PARTIAL";
    }

    let signedPdfUrl = null;
    let pdfGenerationError = null;

    // Create signed PDF if all recipients have signed
    if (allSigned) {
      try {
        console.log(
          `🔄 All recipients signed, generating PDF for document ${document.id}`
        );

        // Get all signature data from all recipients
        const allFields = await prisma.signatureField.findMany({
          where: { documentId: document.id },
        });

        const allSignatureData = allFields
          .filter((field) => field.fieldValue)
          .map((field) => ({
            fieldId: field.id,
            value: field.fieldValue,
          }));

        // Generate the signed PDF with enhanced error handling
        signedPdfUrl = await createSignedPDF(
          { ...document, fields: allFields }, // Include fields in document object
          allSignatureData,
          document.createdBy // Pass user for retention limits if needed
        );

        console.log(`✅ Signed PDF generated successfully: ${signedPdfUrl}`);

        // Validate the generated PDF URL
        if (!signedPdfUrl || !signedPdfUrl.startsWith("http")) {
          throw new Error("Invalid signed PDF URL generated");
        }
      } catch (pdfError) {
        console.error("❌ PDF generation failed:", pdfError);
        pdfGenerationError = pdfError.message;

        // Don't fail the entire signing process, just log it
        // The document will still be marked as signed but without PDF
        await prisma.documentActivity.create({
          data: {
            documentId: document.id,
            action: "COMPLETED", // Still completed, just PDF failed
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            details: {
              pdfGenerationFailed: true,
              error: pdfError.message,
              totalRecipients: updatedRecipients.length,
            },
          },
        });
      }
    }

    // Update document status and signed PDF URL
    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: documentStatus,
        ...(allSigned && {
          signedAt: new Date(),
          ...(signedPdfUrl && { signedPdfUrl }),
        }),
      },
    });

    // Log signing activity
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        recipientId: recipient.id,
        action: "SIGNED",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          recipientEmail: recipient.email,
          fieldsCount: signatureData.length,
          documentStatus,
        },
      },
    });

    // If all signed, log completion and send notifications
    if (allSigned) {
      // Log completion activity
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          action: "COMPLETED",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          details: {
            totalRecipients: updatedRecipients.length,
            signedPdfUrl: signedPdfUrl || null,
            pdfGenerationSuccess: !!signedPdfUrl,
          },
        },
      });

      // Send completion notification (async, don't block response)
      setImmediate(async () => {
        try {
          await sendCompletionNotification(
            document.createdBy,
            {
              ...document,
              signedAt: new Date(),
              signedPdfUrl,
              status: "SIGNED",
            },
            updatedRecipients
          );
        } catch (emailError) {
          console.error("Failed to send completion notification:", emailError);
        }
      });
    }

    // Return comprehensive response
    res.status(200).json({
      success: true,
      message: "Document signed successfully",
      data: {
        signedAt: new Date(),
        isComplete: allSigned,
        documentStatus,
        signedPdfUrl: allSigned ? signedPdfUrl : null,
        recipientStatus: updatedRecipients.map((r) => ({
          email: r.email,
          name: r.name,
          status: r.status,
          signedAt: r.signedAt,
        })),
        // Include any PDF generation warnings
        ...(pdfGenerationError && {
          warnings: [
            `PDF generation encountered an issue: ${pdfGenerationError}`,
          ],
        }),
      },
    });
  } catch (error) {
    console.error("Submit signature error:", error);
    throw new ApiError("Failed to submit signature", 500);
  }
});

// Enhanced function to retry PDF generation for failed documents
export const retryPdfGeneration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdById = req.user.id;

  try {
    // Find completed document without signed PDF
    const document = await prisma.document.findFirst({
      where: {
        id,
        createdById,
        status: "SIGNED",
        signedPdfUrl: null, // Only retry if PDF is missing
      },
      include: {
        fields: true,
        recipients: true,
      },
    });

    if (!document) {
      throw new ApiError("Document not found or PDF already exists", 404);
    }

    console.log(`🔄 Retrying PDF generation for document ${document.id}`);

    // Get all signature data
    const allFields = await prisma.signatureField.findMany({
      where: { documentId: document.id },
    });

    const allSignatureData = allFields
      .filter((field) => field.fieldValue)
      .map((field) => ({
        fieldId: field.id,
        value: field.fieldValue,
      }));

    // Generate the signed PDF
    const signedPdfUrl = await createSignedPDF(
      { ...document, fields: allFields },
      allSignatureData,
      req.user
    );

    // Update document with signed PDF URL
    await prisma.document.update({
      where: { id: document.id },
      data: { signedPdfUrl },
    });

    // Log the retry activity
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        action: "COMPLETED",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          pdfGenerationRetry: true,
          signedPdfUrl,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "PDF generated successfully",
      data: { signedPdfUrl },
    });
  } catch (error) {
    console.error("Retry PDF generation error:", error);
    throw new ApiError("Failed to generate PDF", 500);
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
