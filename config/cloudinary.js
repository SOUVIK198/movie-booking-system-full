const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary using an upload_stream (works well with multer memoryStorage).
 * @param {Buffer} buffer
 * @param {string} folder
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadBufferToCloudinary = (buffer, folder = 'movie-booking/posters') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ quality: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = { cloudinary, uploadBufferToCloudinary, deleteFromCloudinary };