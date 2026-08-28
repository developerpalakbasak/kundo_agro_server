import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUserByAdmin,
    updateUser,
    deleteUser,
    changeUserPasswordByAdmin,
} from '../../controllers/user.controller.js';
import { isAuthenticated, isManagerOrAbove, isAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Read operations allowed for Manager & Admin
router.get('/', isAuthenticated, isManagerOrAbove, getAllUsers);
router.get('/:id', isAuthenticated, isManagerOrAbove, getUserById);

// Modification operations restricted to Admin
router.post('/', isAuthenticated, isAdmin, createUserByAdmin);
router.put('/:id', isAuthenticated, isAdmin, updateUser);
router.patch('/:id', isAuthenticated, isAdmin, updateUser);
router.delete('/:id', isAuthenticated, isAdmin, deleteUser);
router.post('/:id/change-password', isAuthenticated, isAdmin, changeUserPasswordByAdmin);

export default router;
