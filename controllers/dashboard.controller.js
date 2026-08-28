import Product from '../model/product.model.js';
import User from '../model/user.model.js';
import Blog from '../model/blog.model.js';
import Order from '../model/order.model.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Get aggregated dashboard statistics (Admin / Manager / Staff)
 */
export const getDashboardStats = catchAsync(async (req, res) => {
    const [
        totalProducts,
        availableProducts,
        totalUsers,
        totalBlogs,
        totalOrders,
        usersByRole,
        usersByStatus,
        ordersByStatus,
        revenueData,
        recentOrders,
        recentProducts,
        recentUsers,
    ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ isAvailable: true }),
        User.countDocuments(),
        Blog.countDocuments(),
        Order.countDocuments(),
        User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        User.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]),
        Order.find().sort({ createdAt: -1 }).limit(5),
        Product.find().sort({ createdAt: -1 }).limit(5),
        User.find().sort({ createdAt: -1 }).limit(5),
    ]);

    const roleCounts = {
        Admin: 0,
        Manager: 0,
        Staff: 0,
        Customer: 0,
    };
    usersByRole.forEach((curr) => {
        if (curr._id) roleCounts[curr._id] = curr.count;
    });

    const statusCounts = {
        Active: 0,
        Inactive: 0,
    };
    usersByStatus.forEach((curr) => {
        if (curr._id) statusCounts[curr._id] = curr.count;
    });

    const orderStatusCounts = {
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
    };
    ordersByStatus.forEach((curr) => {
        if (curr._id) orderStatusCounts[curr._id] = curr.count;
    });

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.status(200).json({
        success: true,
        data: {
            stats: {
                products: totalProducts,
                availableProducts,
                users: totalUsers,
                blogs: totalBlogs,
                orders: totalOrders,
                totalRevenue,
            },
            breakdown: {
                roles: roleCounts,
                userStatuses: statusCounts,
                orderStatuses: orderStatusCounts,
            },
            recent: {
                orders: recentOrders,
                products: recentProducts,
                users: recentUsers,
            },
        },
    });
});
