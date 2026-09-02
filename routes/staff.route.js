import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
} from '../controllers/product.controller.js';
import {
    createBlog,
    getAllBlogs,
    getBlogByIdOrSlug,
    updateBlog,
} from '../controllers/blog.controller.js';
import {
    getAllOrdersAdmin,
    getOrderByIdOrTracking,
} from '../controllers/order.controller.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { isAuthenticated, isStaffOrAbove } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail, uploadBlogMedia } from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply Staff or Above authorization
router.use(isAuthenticated, isStaffOrAbove);

// 1. Dashboard Stats
router.get('/dashboard/stats', getDashboardStats);
router.get('/stats', getDashboardStats);

// 2. Product Management (Staff)
router.get('/products', getAllProducts);
router.get('/products/:idOrSlug', getProductByIdOrSlug);
router.post('/products', uploadProductThumbnail, createProduct);
router.put('/products/:id', uploadProductThumbnail, updateProduct);
router.patch('/products/:id', uploadProductThumbnail, updateProduct);

// 3. Blog Management (Staff)
router.get('/blogs', getAllBlogs);
router.get('/blogs/:idOrSlug', getBlogByIdOrSlug);
router.post('/blogs', uploadBlogMedia, createBlog);
router.put('/blogs/:id', uploadBlogMedia, updateBlog);
router.patch('/blogs/:id', uploadBlogMedia, updateBlog);

// 4. Order Viewing (Staff)
router.get('/orders', getAllOrdersAdmin);
router.get('/orders/:id', getOrderByIdOrTracking);

export default router;
