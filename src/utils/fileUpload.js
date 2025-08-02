import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ES6 __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const tempDir = path.join(process.cwd(), "uploads", "temp");
  const documentsDir = path.join(process.cwd(), "uploads", "documents");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
};

// Initialize upload directories
ensureUploadDirs();

// Configure multer storage
const createStorage = (destination = "uploads/temp/") => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });
};

// File filter for documents
const documentFileFilter = (req, file, cb) => {
  // Allow PDF, image files, and Word documents
  const allowedTypes = /pdf|jpeg|jpg|png|gif|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  // Check MIME types
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const mimetypeValid = allowedMimeTypes.includes(file.mimetype);

  if (mimetypeValid && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, image files, and Word documents are allowed"));
  }
};

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
  ];

  const mimetypeValid = allowedMimeTypes.includes(file.mimetype);

  if (mimetypeValid && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Create document upload middleware
export const createDocumentUpload = (options = {}) => {
  const {
    destination = "uploads/temp/",
    fileSize = 10 * 1024 * 1024, // 10MB default
    fileFilter = documentFileFilter,
  } = options;

  return multer({
    storage: createStorage(destination),
    limits: {
      fileSize,
    },
    fileFilter,
  });
};

// Create image upload middleware
export const createImageUpload = (options = {}) => {
  const {
    destination = "uploads/temp/",
    fileSize = 5 * 1024 * 1024, // 5MB default for images
  } = options;

  return multer({
    storage: createStorage(destination),
    limits: {
      fileSize,
    },
    fileFilter: imageFileFilter,
  });
};

// Pre-configured upload instances
export const documentUpload = createDocumentUpload();
export const imageUpload = createImageUpload();

// File type utilities
export const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") return "pdf";
  if ([".jpg", ".jpeg", ".png", ".gif"].includes(ext)) return "image";
  if ([".doc", ".docx"].includes(ext)) return "document";

  return "unknown";
};

export const isValidFileType = (
  filename,
  allowedTypes = ["pdf", "image", "document"]
) => {
  const fileType = getFileType(filename);
  return allowedTypes.includes(fileType);
};

// File size utilities
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const validateFileSize = (fileSize, maxSize = 10 * 1024 * 1024) => {
  return fileSize <= maxSize;
};

// Cleanup utilities
export const cleanupTempFiles = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.warn("File cleanup warning:", error.message);
  }
};

export const cleanupOldTempFiles = async (maxAge = 24 * 60 * 60 * 1000) => {
  const tempDir = path.join(process.cwd(), "uploads", "temp");

  try {
    const files = await fs.promises.readdir(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.warn("Temp file cleanup warning:", error.message);
  }
};
