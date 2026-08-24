import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getBlogByIdOrSlug,
    updateBlog,
    deleteBlog
} from '../controllers/blog.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';
import { uploadBlogMedia } from '../middleware/upload.middleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAllBlogs);
router.get('/:idOrSlug', getBlogByIdOrSlug);

// Admin Protected Routes
router.post('/', isAuthenticated, isAdmin, uploadBlogMedia, createBlog);
router.put('/:id', isAuthenticated, isAdmin, uploadBlogMedia, updateBlog);
router.patch('/:id', isAuthenticated, isAdmin, uploadBlogMedia, updateBlog);
router.delete('/:id', isAuthenticated, isAdmin, deleteBlog);

export default router;
