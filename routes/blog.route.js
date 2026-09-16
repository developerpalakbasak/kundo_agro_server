import express from 'express';
import {
    getAllBlogs,
    getBlogTags,
    getBlogByIdOrSlug,
} from '../controllers/blog.controller.js';
import {
    createBlog,
    updateBlog,
    deleteBlog,
} from '../controllers/admin.controller.js';
import { isAuthenticated, isSellerOrAbove, isAdmin } from '../middleware/auth.middleware.js';
import { uploadBlogMedia } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAllBlogs);
router.get('/tags', getBlogTags);
router.get('/:idOrSlug', getBlogByIdOrSlug);

// Protected Seller / Admin Routes (Also available under /api/v1/admin/blogs)
router.post('/', isAuthenticated, isSellerOrAbove, uploadBlogMedia, createBlog);
router.put('/:id', isAuthenticated, isSellerOrAbove, uploadBlogMedia, updateBlog);
router.patch('/:id', isAuthenticated, isSellerOrAbove, uploadBlogMedia, updateBlog);
router.delete('/:id', isAuthenticated, isAdmin, deleteBlog);

export default router;
