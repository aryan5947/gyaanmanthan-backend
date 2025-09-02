import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

if (env.cloudinary.url) {
  cloudinary.config({ cloudinary_url: env.cloudinary.url });
} else {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName!,
    api_key: env.cloudinary.apiKey!,
    api_secret: env.cloudinary.apiSecret!,
  });
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimetype: string,
  folder = env.cloudinary.folder
) {
  const dataURI = `data:${mimetype};base64,${buffer.toString('base64')}`;
  const res = await cloudinary.uploader.upload(dataURI, { folder, resource_type: 'image' });
  return {
    url: res.secure_url,
    publicId: res.public_id,
    width: res.width,
    height: res.height,
    bytes: res.bytes,
    format: res.format,
  };
}
