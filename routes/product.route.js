import express from 'express';
import {
    createProduct,
    createFishSeedProduct,
    getAllProducts,
    getProductCategories,
    getProductByIdOrSlug,
    updateProduct,
    deleteProduct,
} from '../controllers/product.controller.js';
import { isAuthenticated, isStaffOrAbove, isManagerOrAbove, optionalAuth } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAllProducts);
router.get('/categories', getProductCategories);
router.get('/:idOrSlug', getProductByIdOrSlug);

// Customer / Seller Submission
router.post('/fish-seed', optionalAuth, uploadProductThumbnail, createFishSeedProduct);

// Protected Staff / Admin Routes (Also available under /api/v1/admin/products)
router.post('/', isAuthenticated, isStaffOrAbove, uploadProductThumbnail, createProduct);
router.put('/:id', isAuthenticated, isStaffOrAbove, uploadProductThumbnail, updateProduct);
router.patch('/:id', isAuthenticated, isStaffOrAbove, uploadProductThumbnail, updateProduct);
router.delete('/:id', isAuthenticated, isManagerOrAbove, deleteProduct);

export default router;
