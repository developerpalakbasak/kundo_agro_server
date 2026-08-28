import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
    deleteProduct,
} from '../../controllers/product.controller.js';
import { isAuthenticated, isStaffOrAbove, isManagerOrAbove } from '../../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../../middleware/upload.middleware.js';

const router = express.Router();

router.use(isAuthenticated, isStaffOrAbove);

router.get('/', getAllProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);
router.post('/', uploadProductThumbnail, createProduct);
router.put('/:id', uploadProductThumbnail, updateProduct);
router.patch('/:id', uploadProductThumbnail, updateProduct);
router.delete('/:id', isManagerOrAbove, deleteProduct);

export default router;
