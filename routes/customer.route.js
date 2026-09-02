import express from 'express';
import {
    aboutMe,
    updateMyProfile,
    changeAdminPassword,
} from '../controllers/user.controller.js';
import {
    getMyOrders,
    getOrderByIdOrTracking,
} from '../controllers/order.controller.js';
import {
    createFishSeedProduct,
} from '../controllers/product.controller.js';
import { isAuthenticated, optionalAuth } from '../middleware/auth.middleware.js';
import { uploadProductThumbnail } from '../middleware/upload.middleware.js';

const router = express.Router();

// Customer Profile Routes (Authenticated)
router.get('/profile', isAuthenticated, aboutMe);
router.put('/profile', isAuthenticated, updateMyProfile);
router.patch('/profile', isAuthenticated, updateMyProfile);
router.put('/change-password', isAuthenticated, changeAdminPassword);

// Customer Order History (Authenticated)
router.get('/orders', isAuthenticated, getMyOrders);
router.get('/orders/:id', isAuthenticated, getOrderByIdOrTracking);

// Customer / Seller Fish-seed Listing Submission
router.post('/fish-seed', optionalAuth, uploadProductThumbnail, createFishSeedProduct);
router.post('/products/fish-seed', optionalAuth, uploadProductThumbnail, createFishSeedProduct);

export default router;
