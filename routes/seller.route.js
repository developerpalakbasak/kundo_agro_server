import express from 'express';
import {
    getSellerDashboardStats,
    getSellerProducts,
    getSellerProductById,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,
} from '../controllers/seller.controller.js';
import { isAuthenticated, isSellerOrAbove, optionalAuth, disallowAuthenticated } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply Seller or Above authorization for dashboard and seller management
router.use(isAuthenticated, isSellerOrAbove);

// 2. Dashboard Stats
router.get('/dashboard/stats', getSellerDashboardStats);

// 3. Product Management (Seller)
router.get('/products', getSellerProducts);
router.get('/products/:idOrSlug', getSellerProductById);
router.post('/products', uploadProductThumbnail, createSellerProduct);
router.put('/products/:id', uploadProductThumbnail, updateSellerProduct);
router.patch('/products/:id', uploadProductThumbnail, updateSellerProduct);
router.delete('/products/:id', deleteSellerProduct);

export default router;
