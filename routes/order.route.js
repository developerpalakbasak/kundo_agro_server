import express from 'express';
import {
    createOrder,
    getMyOrders,
    getOrderByIdOrTracking,
    initSSLCommerzPayment,
    handleSSLCommerzSuccess,
    handleSSLCommerzFail,
    handleSSLCommerzCancel,
    handleSSLCommerzIPN,
} from '../controllers/order.controller.js';
import { isAuthenticated, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public / Customer Checkout
router.post('/', optionalAuth, createOrder);

// SSLCommerz Payment Integration Routes
router.post('/init-payment/:orderId', optionalAuth, initSSLCommerzPayment);
router.post('/payment/success', handleSSLCommerzSuccess);
router.post('/payment/fail', handleSSLCommerzFail);
router.post('/payment/cancel', handleSSLCommerzCancel);
router.post('/payment/ipn', handleSSLCommerzIPN);

// Customer Personal Order History
router.get('/my-orders', isAuthenticated, getMyOrders);

// Order Tracking by Order ID or ID
router.get('/track/:id', getOrderByIdOrTracking);
router.get('/:id', getOrderByIdOrTracking);

export default router;
