import express from 'express';
import dashboardRoutes from './dashboard.route.js';
import productRoutes from './product.route.js';
import blogRoutes from './blog.route.js';
import orderRoutes from './order.route.js';
import userRoutes from './customer.route.js';
import sellerRoutes from './seller.route.js';

const router = express.Router();

router.use('/dashboard', dashboardRoutes);
router.use('/stats', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/blogs', blogRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/sellers', sellerRoutes);

export default router;
