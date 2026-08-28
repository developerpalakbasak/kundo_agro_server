import express from 'express';
import {
    registerUser,
    login,
    logout,
    aboutMe,
    verifyUser,
    refreshSession,
    changeAdminPassword,
} from '../controllers/user.controller.js';
import { isAuthenticated, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public auth endpoints
router.post('/register', optionalAuth, registerUser);
router.post('/user/register', optionalAuth, registerUser); // legacy alias
router.post('/login', login);
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