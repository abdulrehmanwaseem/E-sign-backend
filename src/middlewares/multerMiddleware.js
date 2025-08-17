import multer from "multer";
import handleMulterError from "../utils/multerApiError.js";

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, JPEG, JPG, PNG, and GIF files are allowed."
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
      return;
    }
    next();
  });
};
