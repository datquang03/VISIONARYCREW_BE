import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a single image to Cloudinary (supports both buffer and file path)
export const uploadImage = async (fileInput, folder) => {
  try {
    let uploadOptions = {
      folder,
      resource_type: "image",
    };

    let result;
    if (Buffer.isBuffer(fileInput)) {
      // Handle buffer (memory storage)
      result = await cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) throw error;
          return result;
        }
      );
      
      // Convert buffer to stream for cloudinary
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        ).end(fileInput);
      });
    } else {
      // Handle file path (disk storage)
      result = await cloudinary.uploader.upload(fileInput, uploadOptions);
      // Delete temporary file only if it's a file path
      if (typeof fileInput === 'string') {
        const fs = await import('fs/promises');
        await fs.unlink(fileInput).catch(() => {});
      }
      return result.secure_url;
    }
  } catch (error) {
    // Clean up file if it exists and is a path
    if (typeof fileInput === 'string') {
      const fs = await import('fs/promises');
      await fs.unlink(fileInput).catch(() => {});
    }
    throw new Error(`Tải ảnh lên Cloudinary thất bại: ${error.message}`);
  }
};

// Upload multiple images to Cloudinary (supports both buffers and file paths)
export const uploadMultipleImages = async (fileInputs, folder) => {
  const uploadPromises = fileInputs.map((fileInput) =>
    uploadImage(fileInput, folder)
  );
  return Promise.all(uploadPromises);
};