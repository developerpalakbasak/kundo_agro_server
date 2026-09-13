import express from 'express';
import { getDashboardStats } from '../../controllers/dashboard.controller.js';
import { isAuthenticated, isSellerOrAbove } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(isAuthenticated, isSellerOrAbove);

router.get('/stats', getDashboardStats);
router.get('/', getDashboardStats);

export default router;
