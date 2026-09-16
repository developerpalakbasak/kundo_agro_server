import express from 'express';
import {
    createFishSeedProduct,
    getAllProducts,
    getProductByIdOrSlug,
    getAllDistricts,
    getAllUnits,
} from '../controllers/product.controller.js';
import {
    createProduct,
    updateProduct,
    deleteProduct,
} from '../controllers/admin.controller.js';
import { isAuthenticated, isSellerOrAbove, isAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../middleware/upload.middleware.js';
import { getAllCategories, createCategory } from '../controllers/category.controller.js';

const router = express.Router();

// Public Routes
router.get('/', getAllProducts);
router.get('/categories', getAllCategories);
router.post('/categories', isAuthenticated, createCategory);
router.get('/districts', getAllDistricts);
router.get('/units', getAllUnits);
router.get('/:idOrSlug', getProductByIdOrSlug);

// Customer / Seller Submission
router.post('/fish-seed', optionalAuth, uploadProductThumbnail, createFishSeedProduct);

// Protected Seller / Admin Routes (Also available under /api/v1/admin/products)
router.post('/', isAuthenticated, isSellerOrAbove, uploadProductThumbnail, createProduct);
router.put('/:id', isAuthenticated, isSellerOrAbove, uploadProductThumbnail, updateProduct);
router.patch('/:id', isAuthenticated, isSellerOrAbove, uploadProductThumbnail, updateProduct);
router.delete('/:id', isAuthenticated, isAdmin, deleteProduct);

export default router;
