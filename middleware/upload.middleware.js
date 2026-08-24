import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AppError from '../utils/appError.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const sanitizeFileName = (name) => {
    const ext = path.extname(name).toLowerCase();
    const base = path
        .basename(name, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
    return `${base || 'file'}${ext || '.bin'}`;
};

const createStorage = (subDirectory) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(process.cwd(), 'uploads', subDirectory);
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            const cleanName = sanitizeFileName(file.originalname);
            cb(null, `${uniqueSuffix}-${cleanName}`);
        }
    });
};

const fileFilter = (allowedTypes, errorMessage) => (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(errorMessage, 400), false);
    }
};

// Upload for Product Images
export const uploadProductThumbnail = multer({
    storage: createStorage('products'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter(
        ALLOWED_IMAGE_TYPES,
        'Invalid image format. Allowed formats: JPG, PNG, WebP, AVIF (max 5MB)'
    )
}).single('thumbnail');

// Upload for Blog Thumbnail and Optional Video
export const uploadBlogMedia = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let subDir = 'blogs';
            if (file.fieldname === 'videoFile') {
                subDir = 'blog-videos';
            }
            const uploadPath = path.join(process.cwd(), 'uploads', subDir);
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            const cleanName = sanitizeFileName(file.originalname);
            cb(null, `${uniqueSuffix}-${cleanName}`);
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB max (for video)
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'thumbnail') {
            if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                return cb(null, true);
            }
            return cb(new AppError('Thumbnail must be a JPG, PNG, WebP, or AVIF image (max 5MB).', 400), false);
        }

        if (file.fieldname === 'videoFile') {
            if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
                return cb(null, true);
            }
            return cb(new AppError('Video must be an MP4, WebM, or OGG video (max 50MB).', 400), false);
        }

        cb(null, true);
    }
}).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'videoFile', maxCount: 1 }
]);

/**
 * Helper to delete a local file if it exists in uploads/
 */
export const removeUploadedFile = async (fileUrl) => {
    if (!fileUrl || typeof fileUrl !== 'string') return;
    if (!fileUrl.startsWith('/uploads/')) return;

    try {
        const relativePath = fileUrl.replace(/^\//, '');
        const fullPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
            console.log(`🗑️ Deleted local file: ${fullPath}`);
        }
    } catch (err) {
        console.warn(`Failed to delete local file ${fileUrl}:`, err.message);
    }
};
