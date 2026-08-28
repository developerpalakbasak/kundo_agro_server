import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getBlogTags,
    getBlogByIdOrSlug,
    updateBlog,
    deleteBlog,
} from '../controllers/blog.controller.js';
import { isAuthenticated, isStaffOrAbove, isManagerOrAbove } from '../middleware/auth.middleware.js';
import { uploadBlogMedia } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAllBlogs);
router.get('/tags', getBlogTags);
router.get('/:idOrSlug', getBlogByIdOrSlug);

// Protected Staff / Admin Routes (Also available under /api/v1/admin/blogs)
router.post('/', isAuthenticated, isStaffOrAbove, uploadBlogMedia, createBlog);
router.put('/:id', isAuthenticated, isStaffOrAbove, uploadBlogMedia, updateBlog);
router.patch('/:id', isAuthenticated, isStaffOrAbove, uploadBlogMedia, updateBlog);
router.delete('/:id', isAuthenticated, isManagerOrAbove, deleteBlog);

export default router;
