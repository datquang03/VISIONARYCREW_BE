import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a single image to Cloudinary
export const uploadImage = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });
    await fs.unlink(filePath); // Delete temporary file
    return result.secure_url;
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error(`Tải ảnh lên Cloudinary thất bại: ${error.message}`);
  }
};

// Upload multiple images to Cloudinary
export const uploadMultipleImages = async (files, folder) => {
  const uploadPromises = files.map((file) =>
    uploadImage(file.path, folder)
  );
  return Promise.all(uploadPromises);
};