import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/stats', isAuthenticated, isAdmin, getDashboardStats);

export default router;
