import express from 'express';
import {
    getAllOrdersAdmin,
    getAdminOrderById,
    updateOrderStatus,
    deleteOrder,
} from '../../controllers/order.controller.js';
import { isAuthenticated, isSellerOrAbove, isAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(isAuthenticated, isSellerOrAbove);

router.get('/', getAllOrdersAdmin);
router.get('/:id', getAdminOrderById);
router.patch('/:id/status', updateOrderStatus);
router.put('/:id/status', updateOrderStatus);
router.patch('/:id', updateOrderStatus);
router.put('/:id', updateOrderStatus);
router.delete('/:id', isAdmin, deleteOrder);

export default router;
