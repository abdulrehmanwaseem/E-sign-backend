import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";
import { getBase64 } from "../utils/helpers.js";
import { v4 as uuid } from "uuid";

const uploadFileToCloudinary = async (file) => {
  const ext = file.originalname.split(".").pop().toLowerCase();
  const resource_type = ext === "pdf" ? "raw" : "image"; // PDF files are uploaded as raw files

  try {
    const result = await cloudinary.uploader.upload(getBase64(file), {
      resource_type,
      type: "upload",
      public_id: uuid(),
    });

    return {
      public_id: result.public_id,
      url: result.secure_url,
      extension: ext,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    throw new ApiError(error.message, 400);
  }
};

const deleteFileFromCloudinary = async (publicId, resource_type) => {
  if (!publicId) throw new ApiError("No public ID provided", 400);

  try {
    const deletedFile = await cloudinary.uploader.destroy(publicId, {
      type: "upload",
      resource_type,
    });

    return deletedFile;
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
    throw new ApiError(error.message, 400);
  }
};

export { deleteFileFromCloudinary, uploadFileToCloudinary };
