import express from 'express';
import {
    getAdminSellers,
    getUserById,
    createUserByAdmin,
    updateUser,
    approveSeller,
    deleteUser,
} from '../../controllers/admin.controller.js';
import { isAuthenticated, isAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Seller Management restricted to Admin
router.use(isAuthenticated, isAdmin);

// GET /api/v1/admin/sellers - Get all sellers for directory
router.get('/', getAdminSellers);
router.get('/:id', getUserById);
router.post('/', createUserByAdmin);
router.put('/:id', updateUser);
router.patch('/:id', updateUser);

// Seller approval endpoints
router.patch('/:id/approve', approveSeller);
router.patch('/:id/approve-seller', approveSeller);
router.put('/:id/approve-seller', approveSeller);
router.post('/:id/approve-seller', approveSeller);

// Delete seller
router.delete('/:id', deleteUser);

export default router;
