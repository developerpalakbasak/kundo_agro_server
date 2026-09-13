import express from 'express';
import {
    createProduct,
    createFishSeedProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
    deleteProduct,
} from '../controllers/product.controller.js';
import { isAuthenticated, isSellerOrAbove, isAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../middleware/upload.middleware.js';
import { getAllCategories } from '../controllers/category.controller.js';
import { getAllDistricts, getAllUnits } from '../controllers/product.controller.js';

const router = express.Router();

// Public Routes
router.get('/', getAllProducts);
router.get('/categories', getAllCategories);
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
