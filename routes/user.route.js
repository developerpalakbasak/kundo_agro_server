import express from 'express';
import {
    getAllUsers,
    getUserById,
    registerUser,
    updateUser,
    deleteUser,
    changeUserPasswordByAdmin
} from '../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// All user management routes require admin privileges
router.use(isAuthenticated, isAdmin);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', registerUser);
router.put('/:id', updateUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/change-password', changeUserPasswordByAdmin);

export default router;
