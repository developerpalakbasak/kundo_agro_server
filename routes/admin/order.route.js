import express from 'express';
import {
    getAllOrdersAdmin,
    getAdminOrderById,
    updateOrderStatus,
    deleteOrder,
} from '../../controllers/order.controller.js';
import { isAuthenticated, isStaffOrAbove, isManagerOrAbove } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(isAuthenticated, isStaffOrAbove);

router.get('/', getAllOrdersAdmin);
router.get('/:id', getAdminOrderById);
router.patch('/:id/status', updateOrderStatus);
router.put('/:id/status', updateOrderStatus);
router.patch('/:id', updateOrderStatus);
router.put('/:id', updateOrderStatus);
router.delete('/:id', isManagerOrAbove, deleteOrder);

export default router;
