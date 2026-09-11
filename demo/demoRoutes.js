import express from 'express';
import { createDemoProducts } from './controllers/products.demo.js';
import { createDemoBlogs } from './controllers/blog.demo.js';
const router = express.Router();

router.get('/createproducts', createDemoProducts);
router.get('/createblogs', createDemoBlogs);

export default router;
