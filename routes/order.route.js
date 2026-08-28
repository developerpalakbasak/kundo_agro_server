import express from 'express';
import {
    createOrder,
    getMyOrders,
    getOrderByIdOrTracking,
} from '../controllers/order.controller.js';
import { isAuthenticated, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public / Customer Checkout
router.post('/', optionalAuth, createOrder);

// Customer Personal Order History
router.get('/my-orders', isAuthenticated, getMyOrders);

// Order Tracking by Order ID or ID
router.get('/track/:id', getOrderByIdOrTracking);
router.get('/:id', getOrderByIdOrTracking);

export default router;
