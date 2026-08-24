import Product from '../model/product.model.js';
import User from '../model/user.model.js';
import Blog from '../model/blog.model.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Get dashboard statistics for admin
 */
export const getDashboardStats = catchAsync(async (req, res) => {
    const [
        totalProducts,
        totalUsers,
        totalBlogs,
        availableProducts,
        usersByRole,
        usersByStatus,
        recentProducts,
        recentUsers
    ] = await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Blog.countDocuments(),
        Product.countDocuments({ isAvailable: true }),
        User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        User.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Product.find().sort({ createdAt: -1 }).limit(5),
        User.find().sort({ createdAt: -1 }).limit(5)
    ]);

    const roleCounts = usersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    const statusCounts = usersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    res.status(200).json({
        success: true,
        data: {
            stats: {
                products: totalProducts,
                availableProducts,
                users: totalUsers,
                blogs: totalBlogs,
                orders: 0
            },
            breakdown: {
                roles: roleCounts,
                statuses: statusCounts
            },
            recent: {
                products: recentProducts,
                users: recentUsers
            }
        }
    });
});
