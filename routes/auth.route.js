import express from 'express';
import {
    registerUser,
    login,
    logout,
    aboutMe,
    verifyUser,
    refreshSession,
    changeAdminPassword,
} from '../controllers/customer.controller.js';
import { createSellerAccount } from '../controllers/seller.controller.js';
import { isAuthenticated, optionalAuth, disallowAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public auth endpoints (rejects request if user already has valid cookies/session)
router.post('/user/register', optionalAuth, disallowAuthenticated, registerUser);
router.post('/seller/register', optionalAuth, disallowAuthenticated, createSellerAccount);
router.post('/login',disallowAuthenticated, login);
router.get('/logout', logout);
router.post('/logout', logout);
router.post('/refresh', refreshSession);
router.get('/refresh', refreshSession);
router.post('/refresh-token', refreshSession);

// Authenticated session & profile endpoints
router.get('/me', isAuthenticated, aboutMe);
router.get('/verify', isAuthenticated, verifyUser);
router.post('/changepassword', isAuthenticated, changeAdminPassword);
router.put('/changepassword', isAuthenticated, changeAdminPassword);
router.post('/admin/changepassword', isAuthenticated, changeAdminPassword); // legacy alias

export default router;