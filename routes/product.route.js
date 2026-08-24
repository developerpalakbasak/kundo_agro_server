import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
    deleteProduct
} from '../controllers/product.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAllProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);

// Admin Protected Routes
router.post('/', isAuthenticated, isAdmin, uploadProductThumbnail, createProduct);
router.put('/:id', isAuthenticated, isAdmin, uploadProductThumbnail, updateProduct);
router.patch('/:id', isAuthenticated, isAdmin, uploadProductThumbnail, updateProduct);
router.delete('/:id', isAuthenticated, isAdmin, deleteProduct);

export default router;
