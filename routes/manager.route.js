import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductByIdOrSlug,
    updateProduct,
    deleteProduct,
} from '../controllers/product.controller.js';
import {
    createBlog,
    getAllBlogs,
    getBlogByIdOrSlug,
    updateBlog,
    deleteBlog,
} from '../controllers/blog.controller.js';
import {
    getAllOrdersAdmin,
    getOrderByIdOrTracking,
    updateOrderStatus,
    deleteOrder,
} from '../controllers/order.controller.js';
import { getAllUsers, getUserById } from '../controllers/user.controller.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { isAuthenticated, isManagerOrAbove } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail, uploadBlogMedia } from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply Manager or Above authorization
router.use(isAuthenticated, isManagerOrAbove);

// 1. Dashboard Stats
router.get('/dashboard/stats', getDashboardStats);
router.get('/stats', getDashboardStats);

// 2. Product Management (Manager - includes deletion)
router.get('/products', getAllProducts);
router.get('/products/:idOrSlug', getProductByIdOrSlug);
router.post('/products', uploadProductThumbnail, createProduct);
router.put('/products/:id', uploadProductThumbnail, updateProduct);
router.patch('/products/:id', uploadProductThumbnail, updateProduct);
router.delete('/products/:id', deleteProduct);

// 3. Blog Management (Manager - includes deletion)
router.get('/blogs', getAllBlogs);
router.get('/blogs/:idOrSlug', getBlogByIdOrSlug);
router.post('/blogs', uploadBlogMedia, createBlog);
router.put('/blogs/:id', uploadBlogMedia, updateBlog);
router.patch('/blogs/:id', uploadBlogMedia, updateBlog);
router.delete('/blogs/:id', deleteBlog);

// 4. Order Management (Manager - includes status updates and deletion)
router.get('/orders', getAllOrdersAdmin);
router.get('/orders/:id', getOrderByIdOrTracking);
router.patch('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

// 5. User Viewing (Manager)
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);

export default router;
