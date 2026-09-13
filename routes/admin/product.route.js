import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
    deleteProduct,
} from '../../controllers/product.controller.js';
import {
    createCategory,
    updateCategory,
    deleteCategory,
} from '../../controllers/category.controller.js';
import { isAuthenticated, isSellerOrAbove, isAdmin } from '../../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../../middleware/upload.middleware.js';

const router = express.Router();

router.use(isAuthenticated, isSellerOrAbove);

// ── Product routes ────────────────────────────────────────────
router.get('/', getAllProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);
router.post('/', uploadProductThumbnail, createProduct);
router.put('/:id', uploadProductThumbnail, updateProduct);
router.patch('/:id', uploadProductThumbnail, updateProduct);
router.delete('/:id', isAdmin, deleteProduct);

// ── Category routes (under /admin/products/category) ─────────
router.post('/category/create', createCategory);
router.put('/category/update/:slug', updateCategory);
router.delete('/category/delete/:slug', isAdmin, deleteCategory);

export default router;
