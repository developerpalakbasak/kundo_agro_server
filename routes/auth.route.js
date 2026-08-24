import express from 'express';
import { 
    registerUser, 
    changeUserPasswordByAdmin, 
    changeAdminPassword, 
    login, 
    logout, 
    aboutMe, 
    getAllUsers, 
    updateUser, 
    deleteUser,
    verifyUser,
    getUserById
} from '../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Defined under /api/v1/auth ...
router.post('/user/register', registerUser);
router.post('/user/changepassword', isAuthenticated, isAdmin, changeUserPasswordByAdmin);
router.post('/admin/changepassword', isAuthenticated, isAdmin, changeAdminPassword);
router.post('/login', login);
router.get('/logout', isAuthenticated, logout);
router.get('/verify', isAuthenticated, verifyUser);
router.get('/me', isAuthenticated, aboutMe);

// Added User Management Routes
router.get('/users', isAuthenticated, isAdmin, getAllUsers);
router.get('/user/:id', isAuthenticated, isAdmin, getUserById);
router.patch('/user/:id', isAuthenticated, isAdmin, updateUser);
router.delete('/user/:id', isAuthenticated, isAdmin, deleteUser);

export default router;