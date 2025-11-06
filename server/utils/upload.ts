import multer from 'multer';
import sharp from 'sharp';
import { Request } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

/**
 * Process and return a profile picture as base64 with cropping.
 *
 * @param file The uploaded file buffer
 * @param cropData Optional crop data {x, y, width, height}
 * @returns The base64 encoded image string with data URL prefix
 */
export const processProfilePicture = async (
  file: Express.Multer.File,
  cropData?: { x: number; y: number; width: number; height: number },
): Promise<string> => {
  let image = sharp(file.buffer);

  // Apply crop if provided
  if (cropData) {
    image = image.extract({
      left: Math.round(cropData.x),
      top: Math.round(cropData.y),
      width: Math.round(cropData.width),
      height: Math.round(cropData.height),
    });
  }

  // Resize to standard profile picture size (400x400)
  const processedBuffer = await image
    .resize(400, 400, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Convert to base64 and return with data URL prefix
  const base64 = processedBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
};

/**
 * Process and return a banner image as base64 with cropping.
 *
 * @param file The uploaded file buffer
 * @param cropData Optional crop data {x, y, width, height}
 * @returns The base64 encoded image string with data URL prefix
 */
export const processBannerImage = async (
  file: Express.Multer.File,
  cropData?: { x: number; y: number; width: number; height: number },
): Promise<string> => {
  let image = sharp(file.buffer);

  // Apply crop if provided
  if (cropData) {
    image = image.extract({
      left: Math.round(cropData.x),
      top: Math.round(cropData.y),
      width: Math.round(cropData.width),
      height: Math.round(cropData.height),
    });
  }

  // Resize to standard banner size (1200x300)
  const processedBuffer = await image
    .resize(1200, 300, {
      fit: 'fill',
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Convert to base64 and return with data URL prefix
  const base64 = processedBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
};
