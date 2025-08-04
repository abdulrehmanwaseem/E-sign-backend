import multer from "multer";
import handleMulterError from "../utils/multerApiError.js";

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, JPEG, JPG, and PNG files are allowed."
      ),
      false
    );
  }
};

const multerUpload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // Max size: 10mb
  },
  fileFilter: fileFilter,
});

export const singleFile = (req, res, next) => {
  multerUpload.single("file")(req, res, (err) => {
    if (err) {
      handleMulterError(err, next, 1); // Handle Multer error
      return; // Don't call next() after error
    }
    next();
  });
};
