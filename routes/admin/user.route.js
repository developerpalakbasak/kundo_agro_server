import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUserByAdmin,
    updateUser,
    deleteUser,
    changeUserPasswordByAdmin,
} from '../../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// User management restricted to Admin
router.use(isAuthenticated, isAdmin);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUserByAdmin);
router.put('/:id', updateUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/change-password', changeUserPasswordByAdmin);

export default router;
