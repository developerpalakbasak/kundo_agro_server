import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
} from '../controllers/product.controller.js';

import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { isAuthenticated, isSellerOrAbove } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail, uploadBlogMedia } from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply Seller or Above authorization
router.use(isAuthenticated, isSellerOrAbove);

// 1. Dashboard Stats
router.get('/dashboard/stats', getDashboardStats);
router.get('/stats', getDashboardStats);

// 2. Product Management (Seller)
router.get('/products', getAllProducts);
router.get('/products/:idOrSlug', getProductByIdOrSlug);
router.post('/products', uploadProductThumbnail, createProduct);
router.put('/products/:id', uploadProductThumbnail, updateProduct);
router.patch('/products/:id', uploadProductThumbnail, updateProduct);

export default router;
