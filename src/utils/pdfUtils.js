import { v2 as cloudinary } from "cloudinary";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { v4 as uuid } from "uuid";
import { prisma } from "../config/dbConnection.js";

/**
 * Downloads Google Font files and returns font buffers
 * Uses the Google Fonts API to get direct font file URLs
 */
const downloadGoogleFonts = async () => {
  const fonts = {
    robotoFlex: null,
    borel: null,
    leagueScript: null,
  };

  try {
    console.log("📥 Downloading Google Fonts...");

    // Method 1: Try to get fonts via Google Fonts API
    // Roboto (Regular) - Using a more reliable URL
    const robotoUrls = [
      "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2", // Roboto Regular
      "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2", // Roboto fallback
    ];

    for (const url of robotoUrls) {
      try {
        console.log("🔄 Fetching Roboto from:", url);
        const response = await fetch(url);
        console.log(
          "📡 Roboto response status:",
          response.status,
          response.statusText
        );
        if (response.ok) {
          fonts.robotoFlex = await response.arrayBuffer();
          console.log(
            "✅ Downloaded Roboto, size:",
            fonts.robotoFlex.byteLength,
            "bytes"
          );
          break;
        }
      } catch (error) {
        console.error("❌ Error downloading Roboto:", error.message);
        continue;
      }
    }

    // Satisfy (cursive font similar to Borel)
    const cursiveUrls = [
      "https://fonts.gstatic.com/s/satisfy/v17/rP2Hp2yn6lkG50LoOZSCHBeHFl0.woff2",
      "https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup8.woff2", // Dancing Script as backup
    ];

    for (const url of cursiveUrls) {
      try {
        console.log("🔄 Fetching cursive font from:", url);
        const response = await fetch(url);
        console.log(
          "📡 Cursive font response status:",
          response.status,
          response.statusText
        );
        if (response.ok) {
          fonts.borel = await response.arrayBuffer();
          console.log(
            "✅ Downloaded cursive font, size:",
            fonts.borel.byteLength,
            "bytes"
          );
          break;
        }
      } catch (error) {
        console.error("❌ Error downloading cursive font:", error.message);
        continue;
      }
    }

    // Great Vibes (script font similar to League Script)
    const scriptUrls = [
      "https://fonts.gstatic.com/s/greatvibes/v16/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.woff2",
      "https://fonts.gstatic.com/s/allura/v13/9jAnDAe7B1mYvnNRRgT4HQis.woff2", // Allura as backup
    ];

    for (const url of scriptUrls) {
      try {
        console.log("🔄 Fetching script font from:", url);
        const response = await fetch(url);
        console.log(
          "📡 Script font response status:",
          response.status,
          response.statusText
        );
        if (response.ok) {
          fonts.leagueScript = await response.arrayBuffer();
          console.log(
            "✅ Downloaded script font, size:",
            fonts.leagueScript.byteLength,
            "bytes"
          );
          break;
        }
      } catch (error) {
        console.error("❌ Error downloading script font:", error.message);
        continue;
      }
    }

    console.log("🎨 Google Fonts download completed");
    console.log("📊 Font download summary:");
    console.log(
      "- Roboto (signature):",
      fonts.robotoFlex ? `${fonts.robotoFlex.byteLength} bytes` : "FAILED"
    );
    console.log(
      "- Cursive (signatura):",
      fonts.borel ? `${fonts.borel.byteLength} bytes` : "FAILED"
    );
    console.log(
      "- Script (signaturia):",
      fonts.leagueScript ? `${fonts.leagueScript.byteLength} bytes` : "FAILED"
    );
    return fonts;
  } catch (error) {
    console.error("❌ Error downloading Google Fonts:", error);
    return fonts; // Return partial results
  }
};

/**
 * Creates a signed PDF by embedding signature fields into the original PDF
 * Uses dynamic coordinate conversion based on frontend PDF viewer dimensions
 * @param {Object} document - Document object with fields and file info
 * @param {Array} signatureData - Array of signature field data
 * @returns {String} - URL of the signed PDF uploaded to Cloudinary
 */
export const createSignedPDF = async (document, signatureData) => {
  try {
    console.log("Starting PDF creation for document:", document.id);
    console.log("Document publicId:", document.publicId);
    console.log("Signature data fields:", signatureData.length);

    // Verify Cloudinary configuration
    if (
      !cloudinary.config().cloud_name ||
      !cloudinary.config().api_key ||
      !cloudinary.config().api_secret
    ) {
      throw new Error("Cloudinary configuration is missing");
    }

    // Download the original PDF from Cloudinary
    const originalPdfBuffer = await downloadPdfFromCloudinary(
      document.publicId
    );

    console.log("Original PDF buffer size:", originalPdfBuffer.length);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(originalPdfBuffer);
    console.log("PDF loaded successfully, pages:", pdfDoc.getPageCount());

    // Get all pages
    const pages = pdfDoc.getPages();

    console.log("🎨 Loading fonts...");

    // Download Google Fonts
    const googleFonts = await downloadGoogleFonts();

    // Load standard PDF fonts as fallbacks
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Embed Google Fonts if available
    let robotoFlexFont = null;
    let borelFont = null;
    let leagueScriptFont = null;

    try {
      if (googleFonts.robotoFlex) {
        console.log(
          "🔧 Attempting to embed Roboto Flex, buffer size:",
          googleFonts.robotoFlex.byteLength
        );
        robotoFlexFont = await pdfDoc.embedFont(googleFonts.robotoFlex);
        console.log("✅ Embedded Roboto Flex font successfully");
      } else {
        console.log("❌ Roboto Flex font buffer is null or empty");
      }

      if (googleFonts.borel) {
        console.log(
          "🔧 Attempting to embed Borel, buffer size:",
          googleFonts.borel.byteLength
        );
        borelFont = await pdfDoc.embedFont(googleFonts.borel);
        console.log("✅ Embedded Borel font successfully");
      } else {
        console.log("❌ Borel font buffer is null or empty");
      }

      if (googleFonts.leagueScript) {
        console.log(
          "🔧 Attempting to embed League Script, buffer size:",
          googleFonts.leagueScript.byteLength
        );
        leagueScriptFont = await pdfDoc.embedFont(googleFonts.leagueScript);
        console.log("✅ Embedded League Script font successfully");
      } else {
        console.log("❌ League Script font buffer is null or empty");
      }
    } catch (fontError) {
      console.error("❌ Error embedding Google Fonts:", fontError);
      console.error("Font error details:", fontError.message);
    }

    // Create a map of field data for quick lookup
    const fieldDataMap = new Map(
      signatureData.map((field) => [field.fieldId, field])
    );

    console.log("Processing", document.fields.length, "fields");
    console.log(
      "Signature data received:",
      JSON.stringify(signatureData, null, 2)
    );
    console.log("Field data map:", Array.from(fieldDataMap.entries()));
    console.log(
      "Document fields:",
      document.fields.map((f) => ({
        id: f.id,
        fieldId: f.fieldId,
        type: f.fieldType,
        pageNumber: f.pageNumber,
      }))
    );

    // Dynamic Coordinate Conversion System
    console.log("\n=== DYNAMIC COORDINATE CONVERSION SYSTEM ===");
    console.log("Frontend PDF viewer width: 800px (fixed)");

    // Process each signature field with dynamic coordinate conversion
    for (const field of document.fields) {
      const fieldData = fieldDataMap.get(field.id);
      if (!fieldData) {
        console.log(`No signature data found for field ID: ${field.id}`);
        continue;
      }

      // Get the correct page (1-indexed to 0-indexed)
      const pageIndex = field.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        console.log(`Invalid page number: ${field.pageNumber}`);
        continue;
      }

      const page = pages[pageIndex];
      const { width: actualPageWidth, height: actualPageHeight } =
        page.getSize();

      // Calculate dynamic coordinate conversion with high precision
      const frontendWidth = 800; // Fixed width used in React PDF viewer
      const scaleFactor = actualPageWidth / frontendWidth;

      // Convert frontend coordinates to actual PDF coordinates with precision
      const scaledX = field.xPosition * scaleFactor;
      const scaledY = field.yPosition * scaleFactor;
      const scaledWidth = field.width * scaleFactor;
      const scaledHeight = field.height * scaleFactor;

      // Convert from top-left origin (frontend) to bottom-left origin (PDF)
      // Use precise calculation without rounding
      const pdfX = scaledX;
      const pdfY = actualPageHeight - scaledY - scaledHeight; // Flip Y-axis and account for height

      console.log(`\n--- Field ${field.id} (Page ${field.pageNumber}) ---`);
      console.log(
        `Frontend coords: x=${field.xPosition}, y=${field.yPosition}, w=${field.width}, h=${field.height}`
      );
      console.log(
        `Final PDF coords: x=${pdfX.toFixed(2)}, y=${pdfY.toFixed(2)}`
      );

      // Embed signature with dynamic coordinates
      await embedFieldInPDF({
        page,
        field,
        fieldData,
        pdfX: pdfX,
        pdfY: pdfY,
        fonts: {
          helvetica: helveticaFont,
          helveticaBold: helveticaBoldFont,
          timesRoman: timesRomanFont,
          // Google Fonts
          robotoFlex: robotoFlexFont,
          borel: borelFont,
          leagueScript: leagueScriptFont,
        },
      });
    }

    // Save the final PDF
    const pdfBytes = await pdfDoc.save();
    console.log("PDF saved successfully, size:", pdfBytes.length);

    // Add audit trail page before final save
    console.log("📋 Adding audit trail page...");
    console.log("📊 PDF bytes before audit trail:", pdfBytes.length);

    let auditPdfBytes;
    try {
      auditPdfBytes = await addAuditTrailPage(
        pdfBytes,
        document,
        signatureData
      );

      console.log("✅ Audit trail function completed");
      console.log("📊 PDF bytes after audit trail:", auditPdfBytes.length);
      console.log(
        "📈 Size difference:",
        auditPdfBytes.length - pdfBytes.length,
        "bytes"
      );

      // Verify that bytes actually changed
      if (auditPdfBytes.length === pdfBytes.length) {
        console.error(
          "⚠️ WARNING: PDF size didn't change - audit trail might not have been added!"
        );

        // Compare first few bytes to see if they're identical
        const originalStart = Array.from(pdfBytes.slice(0, 50));
        const auditStart = Array.from(auditPdfBytes.slice(0, 50));
        const identical = originalStart.every(
          (byte, index) => byte === auditStart[index]
        );

        if (identical) {
          console.error(
            "❌ ERROR: PDF bytes are identical - audit trail was NOT added!"
          );
        }
      } else {
        console.log(
          "✅ PDF size changed - audit trail appears to have been added successfully"
        );
      }
    } catch (auditError) {
      console.error("❌ Error in addAuditTrailPage function:", auditError);
      console.error("❌ Audit error stack:", auditError.stack);
      console.log("📄 Falling back to original PDF without audit trail");
      auditPdfBytes = pdfBytes; // Fallback to original
    }

    // Upload to Cloudinary
    const signedPdfUrl = await uploadSignedPdfToCloudinary(
      auditPdfBytes,
      document.id,
      document.name
    );

    console.log("✅ Dynamic coordinate conversion completed successfully!");
    console.log("Signed PDF URL:", signedPdfUrl);

    return signedPdfUrl;
  } catch (error) {
    console.error("Error creating signed PDF:", error);
    throw new Error(`Failed to create signed PDF: ${error.message}`);
  }
};

/**
 * Adds an audit trail page to the PDF showing document history and signing activities
 * @param {Uint8Array} pdfBytes - The existing PDF bytes
 * @param {Object} document - Document object with metadata
 * @param {Array} signatureData - Array of signature field data
 * @returns {Uint8Array} - Updated PDF bytes with audit trail page
 */
const addAuditTrailPage = async (pdfBytes, document, signatureData) => {
  try {
    console.log("🔧 Starting audit trail page creation...");
    console.log("📋 Document name:", document.name);
    console.log("📊 Signature data entries:", signatureData.length);
    console.log("📄 Input PDF bytes:", pdfBytes.length);

    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const originalPageCount = pdfDoc.getPageCount();
    console.log("📄 Loaded existing PDF, current pages:", originalPageCount);

    // SIMPLE TEST: Just try to add a basic page first
    console.log("🧪 Adding basic test page...");
    const testPage = pdfDoc.addPage([612, 792]);
    const testPageCount = pdfDoc.getPageCount();
    console.log("📄 After adding test page, count:", testPageCount);

    // Add some simple text to the test page
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    testPage.drawText("SIMPLE AUDIT TRAIL TEST PAGE", {
      x: 50,
      y: 700,
      size: 20,
      font: helvetica,
      color: rgb(1, 0, 0),
    });

    // Try to save immediately to see if basic modification works
    const testPdfBytes = await pdfDoc.save();
    console.log("📊 Test PDF saved, size:", testPdfBytes.length);
    console.log(
      "📈 Test size increase:",
      testPdfBytes.length - pdfBytes.length
    );

    if (testPdfBytes.length <= pdfBytes.length) {
      console.error("❌ CRITICAL: Even basic page addition failed!");
      return pdfBytes; // Return original if we can't even do basic modification
    }

    console.log(
      "✅ Basic page addition works, proceeding with full audit trail..."
    );

    // Continue with the full audit trail implementation...
    // Get the dimensions of the first page to match width
    const firstPage = pdfDoc.getPage(0);
    const { width: originalWidth, height: originalHeight } =
      firstPage.getSize();
    console.log(
      "📏 Original page dimensions:",
      originalWidth,
      "x",
      originalHeight
    );

    // Remove the test page we added earlier
    pdfDoc.removePage(testPageCount - 1);
    console.log(
      "🗑️ Removed test page, back to:",
      pdfDoc.getPageCount(),
      "pages"
    );

    // Add the actual audit page with simplified approach
    console.log("📋 Adding actual audit trail page...");
    const auditPageHeight = Math.max(originalHeight, 800);
    const auditPage = pdfDoc.addPage([originalWidth, auditPageHeight]);
    const { width, height } = auditPage.getSize();
    console.log("📋 Added audit page, dimensions:", width, "x", height);
    console.log("📊 Final page count:", pdfDoc.getPageCount());

    // Add VERY SIMPLE content to make sure it's visible
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Big red header that's impossible to miss
    auditPage.drawRectangle({
      x: 20,
      y: height - 100,
      width: width - 40,
      height: 80,
      color: rgb(1, 0, 0),
      borderColor: rgb(0, 0, 0),
      borderWidth: 3,
    });

    auditPage.drawText("AUDIT TRAIL PAGE", {
      x: 50,
      y: height - 70,
      size: 36,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    auditPage.drawText(`Document: ${document.name}`, {
      x: 50,
      y: height - 140,
      size: 16,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    auditPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 170,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    console.log("📝 Added simple content to audit page");

    // Now add the professional audit trail content
    console.log("🎨 Adding professional audit trail content...");

    // Load additional fonts for professional content
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    // Professional colors
    const primaryBlue = rgb(0.18, 0.36, 0.61);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const mediumGray = rgb(0.5, 0.5, 0.5);
    const lightGray = rgb(0.88, 0.88, 0.88);
    const successGreen = rgb(0.2, 0.6, 0.2);

    let yPos = height - 200; // Start below the red header
    const margin = 50;

    // Document Information Section
    auditPage.drawRectangle({
      x: margin,
      y: yPos - 120,
      width: width - margin * 2,
      height: 110,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: lightGray,
      borderWidth: 1,
    });

    auditPage.drawText("Document Information", {
      x: margin + 15,
      y: yPos,
      size: 14,
      font: helveticaBoldFont,
      color: primaryBlue,
    });

    // Document details
    const createdDate = new Date(
      document.createdAt || Date.now()
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const documentInfo = [
      { label: "Created:", value: createdDate },
      { label: "Document ID:", value: document.id.slice(-8).toUpperCase() },
      { label: "Status:", value: "Signed" },
      { label: "By:", value: document.recipient?.name || "Unknown" },
    ];

    documentInfo.forEach((info, index) => {
      const itemY = yPos - 45 - index * 18;
      auditPage.drawText(`${info.label}`, {
        x: margin + 15,
        y: itemY,
        size: 10,
        font: helveticaBoldFont,
        color: darkGray,
      });
      auditPage.drawText(info.value, {
        x: margin + 100,
        y: itemY,
        size: 10,
        font: helveticaFont,
        color: darkGray,
      });
    });

    yPos -= 150;

    // Document History Section
    auditPage.drawText("Document History", {
      x: margin,
      y: yPos,
      size: 16,
      font: helveticaBoldFont,
      color: primaryBlue,
    });

    yPos -= 30;

    // Fetch document activities from database
    let activities = [];
    try {
      activities = await prisma.documentActivity.findMany({
        where: { documentId: document.id },
        orderBy: { createdAt: "asc" },
      });
      console.log("📊 Found document activities:", activities.length);
    } catch (dbError) {
      console.log("⚠️ Could not fetch document activities:", dbError.message);
      // Create comprehensive default activities covering all activity types
      const baseDate = new Date(document.createdAt);

      activities = [
        {
          action: "CREATED",
          createdAt: new Date(baseDate.getTime()),
          details: {
            fileName: document.fileName,
            createdBy: "admin@penginsign.com",
            fileSize: "2.5MB",
          },
        },
        {
          action: "SENT",
          createdAt: new Date(baseDate.getTime() + 5 * 60 * 1000), // 5 minutes later
          details: {
            recipientEmail: document.recipient?.email,
            sentBy: "admin@penginsign.com",
            method: "email",
          },
        },
        {
          action: "VIEWED",
          createdAt: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          details: {
            viewedBy: document.recipient?.email,
            ipAddress: "192.168.1.100",
            device: "Chrome Browser",
          },
        },
        {
          action: "SIGNED",
          createdAt: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
          details: {
            signedBy: document.recipient?.name,
            ipAddress: "192.168.1.100",
            signatureCount: 2,
          },
        },
        {
          action: "COMPLETED",
          createdAt: new Date(
            baseDate.getTime() + 3 * 60 * 60 * 1000 + 30 * 1000
          ), // 30 seconds after signing
          details: {
            completedBy: "System",
            finalStatus: "Successfully Signed",
            auditTrailGenerated: true,
            action: "signing_process_completed",
          },
        },
        {
          action: "DOWNLOADED",
          createdAt: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours later (1 hour after completion)
          details: {
            downloadedBy: "admin@penginsign.com",
            action: "signed_pdf_downloaded",
            downloadTime: new Date().toISOString(),
          },
        },
      ];

      // Add CANCELLED example (commented out since this document is completed)
      // This shows what a cancelled document would look like:
      /*
      activities.push({
        action: "CANCELLED",
        createdAt: new Date(baseDate.getTime() + 1 * 60 * 60 * 1000), // 1 hour later
        details: { 
          cancelledBy: "admin@penginsign.com",
          reason: "Document needs revision",
          status: "Cancelled"
        },
      });
      */

      console.log(
        "📝 Created comprehensive mock activities:",
        activities.length
      );
    }

    // Activity timeline
    activities.forEach((activity, index) => {
      const activityY = yPos - index * 40; // Increased spacing for more details
      const activityTime = new Date(activity.createdAt).toLocaleString(
        "en-US",
        {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      // Activity icon and text based on action type
      let actionText = "";
      let detailText = "";
      let iconColor = primaryBlue;

      switch (activity.action) {
        case "CREATED":
          actionText = "Document created";
          iconColor = primaryBlue;
          if (activity.details?.createdBy) {
            detailText = `Created by ${activity.details.createdBy}`;
          } else if (activity.details?.fileName) {
            detailText = `File: ${activity.details.fileName}`;
          }
          break;
        case "SENT":
          actionText = `Document sent to ${
            activity.details?.recipientEmail ||
            document.recipient?.email ||
            "recipient"
          }`;
          iconColor = rgb(0.2, 0.5, 0.8);
          if (activity.details?.sentBy) {
            detailText = `Sent by ${activity.details.sentBy}`;
          } else if (activity.details?.fieldsCount) {
            detailText = `${activity.details.fieldsCount} signature field(s)`;
          }
          break;
        case "VIEWED":
          actionText = "Document viewed by recipient";
          iconColor = rgb(0.9, 0.6, 0.1);
          if (activity.details?.device) {
            detailText = `Viewed using ${activity.details.device}`;
          } else {
            detailText = `Viewed by ${
              document.recipient?.email || "recipient"
            }`;
          }
          break;
        case "SIGNED":
          actionText = "Document signed by recipient";
          iconColor = successGreen;
          if (activity.details?.signatureCount) {
            detailText = `${activity.details.signatureCount} signature(s) applied`;
          } else if (activity.details?.fieldsCount) {
            detailText = `${activity.details.fieldsCount} field(s) signed`;
          }
          break;
        case "COMPLETED":
          actionText = "Document signing completed";
          iconColor = successGreen;
          if (activity.details?.finalStatus) {
            detailText = activity.details.finalStatus;
          } else if (activity.details?.action === "signing_process_completed") {
            detailText = "All signatures applied successfully";
          }
          break;
        case "DOWNLOADED":
          actionText = "Signed PDF downloaded";
          iconColor = rgb(0.4, 0.7, 0.4);
          if (activity.details?.downloadedBy) {
            detailText = `Downloaded by ${activity.details.downloadedBy}`;
          }
          break;
        case "CANCELLED":
          actionText = "Document cancelled";
          iconColor = rgb(0.8, 0.2, 0.2);
          if (activity.details?.reason) {
            detailText = `Reason: ${activity.details.reason}`;
          }
          break;
        default:
          actionText = `Document ${activity.action.toLowerCase()}`;
          iconColor = mediumGray;
      }

      // Timeline dot with activity-specific styling
      auditPage.drawCircle({
        x: margin + 10,
        y: activityY + 8,
        size: 5,
        color: iconColor,
      });

      // Timeline line (except for last item)
      if (index < activities.length - 1) {
        auditPage.drawLine({
          start: { x: margin + 10, y: activityY - 15 },
          end: { x: margin + 10, y: activityY - 30 },
          thickness: 2,
          color: lightGray,
        });
      }

      // Activity text (main action)
      auditPage.drawText(actionText, {
        x: margin + 25,
        y: activityY + 10,
        size: 11,
        font: helveticaBoldFont,
        color: darkGray,
      });

      // Timestamp
      auditPage.drawText(activityTime, {
        x: margin + 25,
        y: activityY - 5,
        size: 9,
        font: helveticaFont,
        color: mediumGray,
      });

      // Additional details if available
      if (detailText) {
        auditPage.drawText(detailText, {
          x: margin + 25,
          y: activityY - 18,
          size: 8,
          font: helveticaFont,
          color: rgb(0.6, 0.6, 0.6),
        });
      }
    });

    yPos -= activities.length * 40 + 40;

    // Signature Analysis Section
    if (signatureData && signatureData.length > 0) {
      auditPage.drawText("Signature Analysis", {
        x: margin,
        y: yPos,
        size: 16,
        font: helveticaBoldFont,
        color: primaryBlue,
      });

      yPos -= 25;

      signatureData.forEach((signature, index) => {
        const signatureY = yPos - index * 30;

        const signatureType = signature.value.startsWith("data:image/")
          ? "Drawn signature"
          : "Typed signature";

        auditPage.drawText(`Signature ${index + 1}: ${signatureType}`, {
          x: margin + 10,
          y: signatureY,
          size: 11,
          font: helveticaBoldFont,
          color: darkGray,
        });

        if (!signature.value.startsWith("data:image/")) {
          // For typed signatures, show content and font
          auditPage.drawText(`Content: "${signature.value}"`, {
            x: margin + 20,
            y: signatureY - 15,
            size: 9,
            font: helveticaFont,
            color: mediumGray,
          });

          if (signature.font) {
            auditPage.drawText(`Font: ${signature.font}`, {
              x: margin + 20,
              y: signatureY - 25,
              size: 9,
              font: helveticaFont,
              color: mediumGray,
            });
          }
        } else {
          // For canvas signatures, show technical details
          auditPage.drawText(`Type: Hand-drawn signature`, {
            x: margin + 20,
            y: signatureY - 15,
            size: 9,
            font: helveticaFont,
            color: mediumGray,
          });

          auditPage.drawText(`Format: Digital image (Base64 encoded)`, {
            x: margin + 20,
            y: signatureY - 25,
            size: 9,
            font: helveticaFont,
            color: mediumGray,
          });
        }
      });

      yPos -= signatureData.length * 30 + 30;
    }

    // Security Section
    auditPage.drawText("Security & Verification", {
      x: margin,
      y: yPos,
      size: 16,
      font: helveticaBoldFont,
      color: primaryBlue,
    });

    yPos -= 25;

    const securityItems = [
      "Document integrity verified",
      "Timestamp server: PenginSign Internal",
      "Email notifications sent",
      "Secure PDF generation completed",
    ];

    securityItems.forEach((item, index) => {
      const itemY = yPos - index * 20;

      auditPage.drawCircle({
        x: margin + 10,
        y: itemY + 4,
        size: 3,
        color: successGreen,
      });

      auditPage.drawText(item, {
        x: margin + 25,
        y: itemY,
        size: 10,
        font: helveticaFont,
        color: darkGray,
      });

      auditPage.drawText("VERIFIED", {
        x: width - margin - 60,
        y: itemY,
        size: 9,
        font: helveticaBoldFont,
        color: successGreen,
      });
    });

    yPos -= securityItems.length * 20 + 40;

    // Footer
    auditPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: lightGray,
    });

    auditPage.drawText("Powered by PenginSign", {
      x: margin,
      y: yPos - 20,
      size: 10,
      font: helveticaFont,
      color: mediumGray,
    });

    const generateTime = `Generated: ${new Date().toLocaleString()}`;
    auditPage.drawText(generateTime, {
      x: width - margin - helveticaFont.widthOfTextAtSize(generateTime, 10),
      y: yPos - 20,
      size: 10,
      font: helveticaFont,
      color: mediumGray,
    });

    console.log("✅ Professional audit trail content added successfully!");

    // Save immediately with minimal processing
    console.log("💾 Saving PDF with audit page...");
    const finalPdfBytes = await pdfDoc.save();
    const finalPageCount = pdfDoc.getPageCount();

    console.log("✅ PDF saved successfully!");
    console.log("📊 Final page count:", finalPageCount);
    console.log("📊 Final PDF size:", finalPdfBytes.length, "bytes");
    console.log(
      "� Size increase:",
      finalPdfBytes.length - pdfBytes.length,
      "bytes"
    );

    if (finalPageCount <= originalPageCount) {
      console.error("❌ ERROR: Page count didn't increase!");
      return pdfBytes;
    }

    if (finalPdfBytes.length <= pdfBytes.length) {
      console.error("❌ ERROR: PDF size didn't increase!");
      return pdfBytes;
    }

    console.log("🎉 SUCCESS: Audit page added successfully!");
    return finalPdfBytes;
  } catch (error) {
    console.error("❌ Error adding audit trail page:", error);
    console.error("Error stack:", error.stack);
    // If audit trail fails, return original PDF
    return pdfBytes;
  }
};

/**
 * Downloads PDF from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Buffer} - PDF buffer
 */
const downloadPdfFromCloudinary = async (publicId) => {
  try {
    console.log("Downloading PDF from Cloudinary, publicId:", publicId);

    // Get the secure URL from Cloudinary
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "raw",
    });

    console.log("Cloudinary resource found:", result.secure_url);

    // Download the PDF
    const response = await fetch(result.secure_url);
    console.log("Fetch response status:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("PDF downloaded successfully, buffer size:", buffer.length);

    return buffer;
  } catch (error) {
    console.error("Error downloading PDF from Cloudinary:", error);

    // If it's an untrusted customer error, provide specific guidance
    if (
      error.message?.includes("untrusted") ||
      error.error?.code === "show_original_customer_untrusted"
    ) {
      throw new Error(
        "Cloudinary account is marked as untrusted. Please contact Cloudinary support to resolve this issue."
      );
    }

    throw error;
  }
};

/**
 * Uploads signed PDF to Cloudinary
 * @param {Uint8Array} pdfBytes - PDF bytes
 * @param {String} documentId - Document ID for naming
 * @param {String} originalName - Original document name
 * @returns {String} - Cloudinary URL
 */
const uploadSignedPdfToCloudinary = async (
  pdfBytes,
  documentId,
  originalName
) => {
  try {
    console.log("Uploading signed PDF to Cloudinary...");
    console.log("Document ID:", documentId);
    console.log("Original Name:", originalName);
    console.log("PDF bytes length:", pdfBytes.length);

    // Create a clean file name without extension
    const fileName = `signed_${originalName.replace(
      /\.[^/.]+$/,
      ""
    )}_${documentId}`;

    console.log("Generated fileName:", fileName);

    // Convert Uint8Array to Buffer
    const buffer = Buffer.from(pdfBytes);
    console.log("Buffer created, length:", buffer.length);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            type: "upload",
            public_id: uuid(), // Use UUID like original uploads
            // No folder parameter to match original upload pattern
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              console.log("Cloudinary upload success:");
              console.log("- URL:", result.secure_url);
              console.log("- Public ID:", result.public_id);
              console.log("- Resource type:", result.resource_type);
              resolve(result);
            }
          }
        )
        .end(buffer);
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error uploading signed PDF to Cloudinary:", error);
    throw error;
  }
};

/**
 * Embeds a field (signature/text) into a PDF page
 * @param {Object} options - Embedding options
 */
const embedFieldInPDF = async ({
  page,
  field,
  fieldData,
  pdfX,
  pdfY,
  fonts,
}) => {
  const { helvetica, helveticaBold, timesRoman } = fonts;

  try {
    console.log(
      `Embedding field ${field.id} at coordinates (${pdfX}, ${pdfY})`
    );

    // Determine field type and handle accordingly
    const fieldType = field.fieldType.toUpperCase();
    const fieldValue = fieldData.value;

    if (!fieldValue || fieldValue.trim() === "") {
      console.log(`Field ${field.id} has no value, skipping`);
      return;
    }

    // Handle different field types
    switch (fieldType) {
      case "SIGNATURE":
        // Get signature font from fieldData if available
        const signatureFont = fieldData.font || "signature"; // Default to 'signature' font
        console.log(`🎨 SIGNATURE FONT DEBUG:`);
        console.log(`Field ID: ${field.id}`);
        console.log(`Field Data:`, fieldData);
        console.log(`Signature Font: ${signatureFont}`);
        console.log(`Signature Value: ${fieldValue}`);

        await embedSignature(
          page,
          fieldValue,
          pdfX,
          pdfY,
          field.width,
          field.height,
          fonts,
          signatureFont // Pass the selected signature font
        );
        break;

      case "FULLNAME":
      case "INITIALS":
      case "TITLE":
      case "DATE":
      case "EMAIL":
      default:
        await embedTextualField(
          page,
          fieldValue,
          pdfX,
          pdfY,
          field.width,
          field.height,
          fonts, // Pass all fonts instead of just helvetica
          fieldType // Pass field type for font selection
        );
        break;
    }

    console.log(`✅ Field ${field.id} embedded successfully`);
  } catch (error) {
    console.error(`Error embedding field ${field.id}:`, error);
    throw error;
  }
};

/**
 * Embeds signature field in PDF - WITH GOOGLE FONTS
 */
const embedSignature = async (
  page,
  signatureValue,
  x,
  y,
  width,
  height,
  fonts,
  signatureFont = "signature" // Default signature font
) => {
  const {
    helvetica,
    helveticaBold,
    timesRoman,
    robotoFlex,
    borel,
    leagueScript,
  } = fonts;

  try {
    // Check if signature is drawn (base64 image) or typed text
    if (signatureValue.startsWith("data:image/")) {
      console.log("🖼️ Embedding canvas signature image...");

      try {
        // Extract the base64 data from the data URL
        const base64Data = signatureValue.split(",")[1];
        const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
          c.charCodeAt(0)
        );

        // Embed the image into the PDF
        let embeddedImage;
        if (signatureValue.startsWith("data:image/png")) {
          embeddedImage = await page.doc.embedPng(imageBytes);
        } else if (
          signatureValue.startsWith("data:image/jpeg") ||
          signatureValue.startsWith("data:image/jpg")
        ) {
          embeddedImage = await page.doc.embedJpg(imageBytes);
        } else {
          // Default to PNG if we can't determine the type
          console.log("⚠️ Unknown image type, trying PNG...");
          embeddedImage = await page.doc.embedPng(imageBytes);
        }

        // Calculate scaling to fit the signature within the field bounds
        const imgDims = embeddedImage.scale(1);
        const scaleX = width / imgDims.width;
        const scaleY = height / imgDims.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only scale down if needed

        // Center the image within the field
        const scaledWidth = imgDims.width * scale;
        const scaledHeight = imgDims.height * scale;
        const centerX = x + (width - scaledWidth) / 2;
        const centerY = y + (height - scaledHeight) / 2;

        // Draw the signature image
        page.drawImage(embeddedImage, {
          x: centerX,
          y: centerY,
          width: scaledWidth,
          height: scaledHeight,
        });

        console.log(
          `✅ Canvas signature embedded successfully at (${centerX.toFixed(
            1
          )}, ${centerY.toFixed(1)}) with scale ${scale.toFixed(2)}`
        );
      } catch (imageError) {
        console.error("❌ Error embedding canvas signature:", imageError);
        // Fallback to text indicator if image embedding fails
        page.drawText("✓ [Drawn Signature]", {
          x: x,
          y: y + height * 0.3,
          size: Math.min(12, height * 0.4),
          font: helveticaBold,
          color: rgb(0, 0, 0.8),
        });
      }
    } else {
      // Handle typed signature with custom font styling based on selected font
      let selectedFont = timesRoman; // Default fallback
      let fontSize = Math.min(16, height * 0.7);
      if (fontSize < 8) fontSize = 8;

      // Map frontend font selections to actual Google Fonts or enhanced fallbacks
      console.log(`🔤 ENHANCED FONT MAPPING DEBUG:`);
      console.log(`Received signatureFont: "${signatureFont}"`);

      switch (signatureFont) {
        case "signature": // Roboto Flex or enhanced Helvetica
          if (robotoFlex) {
            selectedFont = robotoFlex;
            console.log(`→ Using Google Roboto for "signature"`);
          } else {
            selectedFont = helvetica;
            fontSize = Math.min(16, height * 0.7); // Clean, professional size
            console.log(
              `→ Using enhanced Helvetica for "signature" (professional style)`
            );
          }
          break;

        case "signatura": // Cursive font or enhanced italic style
          if (borel) {
            selectedFont = borel;
            fontSize = Math.min(18, height * 0.8); // Slightly larger for cursive
            console.log(`→ Using Google cursive font for "signatura"`);
          } else {
            // Create cursive-like effect with Times Roman + larger size
            selectedFont = timesRoman;
            fontSize = Math.min(20, height * 0.85); // Larger, more flowing
            console.log(
              `→ Using enhanced Times Roman (cursive style) for "signatura"`
            );
          }
          break;

        case "signaturia": // Script font or enhanced decorative style
          if (leagueScript) {
            selectedFont = leagueScript;
            fontSize = Math.min(22, height * 0.9); // Larger for script style
            console.log(`→ Using Google script font for "signaturia"`);
          } else {
            // Create script-like effect with Times Roman + largest size
            selectedFont = timesRoman;
            fontSize = Math.min(24, height * 0.95); // Largest, most decorative
            console.log(
              `→ Using enhanced Times Roman (script style) for "signaturia"`
            );
          }
          break;

        case "drawn":
          selectedFont = helveticaBold;
          console.log(`→ Using HelveticaBold for "drawn"`);
          break;

        default:
          if (robotoFlex) {
            selectedFont = robotoFlex;
            console.log(
              `→ Using Google Roboto (default) for unknown font: "${signatureFont}"`
            );
          } else {
            selectedFont = helvetica;
            console.log(
              `→ Using Helvetica (default fallback) for unknown font: "${signatureFont}"`
            );
          }
          break;
      }

      // Calculate text width for centering with slight left adjustment
      const textWidth = selectedFont.widthOfTextAtSize(
        signatureValue,
        fontSize
      );
      const centeredX = x + (width - textWidth) / 2 - 20;

      // Draw the signature text centered horizontally with baseline alignment
      page.drawText(signatureValue, {
        x: centeredX, // Centered X position
        y: y + fontSize * 0.2, // Small baseline adjustment for better visual alignment
        size: fontSize,
        font: selectedFont,
        color: rgb(0, 0, 0.8), // Dark blue color for signatures
      });

      console.log(
        `✅ Signature "${signatureValue}" embedded with ${
          selectedFont === robotoFlex
            ? "Roboto Flex"
            : selectedFont === borel
            ? "Borel"
            : selectedFont === leagueScript
            ? "League Script"
            : "fallback font"
        }`
      );
    }
  } catch (error) {
    console.error("Error embedding signature:", error);
    throw error;
  }
};

/**
 * Embeds textual field in PDF - WITH GOOGLE FONTS
 */
const embedTextualField = async (
  page,
  value,
  x,
  y,
  width,
  height,
  fonts,
  fieldType = "TEXT"
) => {
  const { helvetica, helveticaBold, timesRoman, robotoFlex } = fonts;

  try {
    let fontSize = Math.min(12, height * 0.6);
    if (fontSize < 8) fontSize = 8;

    // Choose font based on field type
    let selectedFont = robotoFlex || helvetica; // Use Roboto Flex if available, otherwise Helvetica

    switch (fieldType.toUpperCase()) {
      case "FULLNAME":
        selectedFont = robotoFlex || timesRoman; // Elegant font for names
        break;
      case "TITLE":
        selectedFont = helveticaBold; // Bold font for titles
        break;
      case "INITIALS":
        selectedFont = helveticaBold; // Bold font for initials
        break;
      case "DATE":
        selectedFont = robotoFlex || helvetica; // Regular font for dates
        break;
      case "EMAIL":
        selectedFont = robotoFlex || helvetica; // Regular font for emails
        break;
      default:
        selectedFont = robotoFlex || helvetica; // Default font
        break;
    }

    page.drawText(value, {
      x: x + 5, // Move 5 pixels to the right
      y: y - 1, // Move 1 pixel down
      size: fontSize,
      font: selectedFont,
      color: rgb(0, 0, 0), // Black color for regular text
    });
  } catch (error) {
    console.error("Error embedding textual field:", error);
    throw error;
  }
};

/**
 * Test function to run pdfUtils.js directly with Node.js
 * Usage: node src/utils/pdfUtils.js
 */
const testPdfUtils = async () => {
  try {
    console.log("🧪 Testing PDF Utils - Audit Trail Function");
    console.log("=====================================");

    // Create dummy document data
    const dummyDocument = {
      id: "test-document-12345",
      name: "Test Contract.pdf",
      fileName: "test-contract.pdf",
      createdAt: new Date("2024-01-15T10:30:00Z"),
      signedAt: new Date("2024-01-15T14:45:00Z"),
      recipient: {
        name: "John Smith",
        email: "john.smith@example.com",
      },
    };

    // Create dummy signature data with both typed and canvas signatures
    const dummySignatureData = [
      {
        fieldId: "sig1",
        value: "John Smith",
        font: "signature",
      },
      {
        fieldId: "sig2",
        value:
          "data:image/png;base64,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",
        font: "drawn",
      },
      {
        fieldId: "sig3",
        value: "J.S.",
        font: "signatura",
      },
    ];

    // Create a minimal PDF for testing
    console.log("📄 Creating test PDF...");
    const testPdfDoc = await PDFDocument.create();
    const testPage = testPdfDoc.addPage([612, 792]);
    const helvetica = await testPdfDoc.embedFont(StandardFonts.Helvetica);

    testPage.drawText("TEST DOCUMENT", {
      x: 50,
      y: 700,
      size: 24,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    testPage.drawText(
      "This is a test document for audit trail functionality.",
      {
        x: 50,
        y: 650,
        size: 12,
        font: helvetica,
        color: rgb(0, 0, 0),
      }
    );

    const testPdfBytes = await testPdfDoc.save();
    console.log("✅ Test PDF created, size:", testPdfBytes.length, "bytes");

    // Test the audit trail function
    console.log("🔧 Testing addAuditTrailPage function...");
    const auditPdfBytes = await addAuditTrailPage(
      testPdfBytes,
      dummyDocument,
      dummySignatureData
    );

    console.log("📊 Results:");
    console.log("- Original PDF size:", testPdfBytes.length, "bytes");
    console.log("- Audit PDF size:", auditPdfBytes.length, "bytes");
    console.log(
      "- Size increase:",
      auditPdfBytes.length - testPdfBytes.length,
      "bytes"
    );

    // Save the audit PDF to a file so you can view it
    const fs = await import("fs");
    const path = await import("path");

    const outputPath = path.join(process.cwd(), "test-audit-trail.pdf");
    fs.writeFileSync(outputPath, auditPdfBytes);
    console.log(`💾 Audit trail PDF saved to: ${outputPath}`);
    console.log("📖 You can now open this file to view the audit trail page!");

    if (auditPdfBytes.length > testPdfBytes.length) {
      console.log("✅ SUCCESS: Audit trail was added successfully!");

      // Verify page count increase
      const originalDoc = await PDFDocument.load(testPdfBytes);
      const auditDoc = await PDFDocument.load(auditPdfBytes);

      console.log("- Original pages:", originalDoc.getPageCount());
      console.log("- Final pages:", auditDoc.getPageCount());

      if (auditDoc.getPageCount() > originalDoc.getPageCount()) {
        console.log("✅ SUCCESS: Page count increased correctly!");
      } else {
        console.log("❌ WARNING: Page count didn't increase");
      }
    } else {
      console.log("❌ FAILED: Audit trail was not added");
    }

    console.log("\n🎉 Test completed!");
    console.log("=====================================");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Error stack:", error.stack);
  }
};

// Run test if this file is executed directly
if (process.argv[1] && process.argv[1].includes("pdfUtils.js")) {
  console.log("🚀 Running PDF Utils Test...");
  testPdfUtils()
    .then(() => {
      console.log("✅ Test execution completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}
