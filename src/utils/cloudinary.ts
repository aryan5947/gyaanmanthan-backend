// utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

// ✅ Flexible config: prefer full URL if provided, else use individual keys
if (env.cloudinary.url) {
  cloudinary.config({ cloudinary_url: env.cloudinary.url });
} else {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName!,
    api_key: env.cloudinary.apiKey!,
    api_secret: env.cloudinary.apiSecret!,
  });
}

/**
 * Uploads a file buffer to Cloudinary
 * @param buffer - File buffer from multer
 * @param mimetype - MIME type of the file
 * @param folder - Optional folder name (defaults to env.cloudinary.folder)
 * @returns Uploaded file metadata
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimetype: string,
  folder: string = env.cloudinary.folder
) {
  try {
    // ✅ Decide resource_type dynamically
    let resourceType: "image" | "video" | "raw" = "raw";
    if (mimetype.startsWith("image/")) resourceType = "image";
    else if (mimetype.startsWith("video/")) resourceType = "video";

    // ✅ Convert buffer to Data URI
    const dataURI = `data:${mimetype};base64,${buffer.toString("base64")}`;

    // ✅ Upload to Cloudinary
    const res = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: resourceType,
    });

    return {
      url: res.secure_url,
      publicId: res.public_id,
      width: res.width,
      height: res.height,
      bytes: res.bytes,
      format: res.format,
      resourceType,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload file to Cloudinary");
  }
}
