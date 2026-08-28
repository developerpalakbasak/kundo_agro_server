import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getBlogByIdOrSlug,
    updateBlog,
    deleteBlog,
} from '../../controllers/blog.controller.js';
import { isAuthenticated, isStaffOrAbove, isManagerOrAbove } from '../../middleware/auth.middleware.js';
import { uploadBlogMedia } from '../../middleware/upload.middleware.js';

const router = express.Router();

router.use(isAuthenticated, isStaffOrAbove);

router.get('/', getAllBlogs);
router.get('/:idOrSlug', getBlogByIdOrSlug);
router.post('/', uploadBlogMedia, createBlog);
router.put('/:id', uploadBlogMedia, updateBlog);
router.patch('/:id', uploadBlogMedia, updateBlog);
router.delete('/:id', isManagerOrAbove, deleteBlog);

export default router;
