import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

// Models
import Product from '../model/product.model.js';
import User from '../model/user.model.js';
import Blog from '../model/blog.model.js';
import Order from '../model/order.model.js';

// Utilities & Middleware
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import slugify from '../utils/slugify.js';
import { removeUploadedFile } from '../middleware/upload.middleware.js';

// Category Helper Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATEGORY_FILE = join(__dirname, '../data/category.json');

const readCategories = () => {
    const raw = readFileSync(CATEGORY_FILE, 'utf-8');
    return JSON.parse(raw);
};

const writeCategories = (data) => {
    writeFileSync(CATEGORY_FILE, JSON.stringify(data, null, 4), 'utf-8');
};

const toSlug = (text) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');

/* ─────────────────────────────────────────────────────────────
 * 1. DASHBOARD CONTROLLER FUNCTIONS
 * ───────────────────────────────────────────────────────────── */

/**
 * Get aggregated dashboard statistics (Admin / Seller)
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
        Seller: 0,
        Customer: 0,
    };
    usersByRole.forEach((curr) => {
        if (curr._id) {
            if (curr._id === 'Staff') {
                roleCounts.Seller = (roleCounts.Seller || 0) + curr.count;
            } else if (Object.prototype.hasOwnProperty.call(roleCounts, curr._id)) {
                roleCounts[curr._id] = curr.count;
            }
        }
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

/* ─────────────────────────────────────────────────────────────
 * 2. USER / SELLER ADMIN CONTROLLER FUNCTIONS
 * ───────────────────────────────────────────────────────────── */

/**
 * Get all sellers for Admin directory (combining seller users & products with seller info)
 */
export const getAdminSellers = catchAsync(async (req, res) => {
    // 1. Get products that have seller details
    const productsWithSellers = await Product.find({
        $or: [
            { sellerName: { $exists: true, $ne: null, $ne: '' } },
            { sellerDistrict: { $exists: true, $ne: null, $ne: '' } },
            { seller: { $exists: true, $ne: null } },
        ],
    }).populate('seller', 'name email phone status isVerifiedSeller avatar');

    // 2. Get registered users with role 'Seller' or isVerifiedSeller: true
    const sellerUsers = await User.find({
        $or: [{ role: 'Seller' }, { isVerifiedSeller: true }],
    });

    const combinedList = [];
    const seenKeys = new Set();

    // Add seller users first
    sellerUsers.forEach((u) => {
        const key = u._id.toString();
        seenKeys.add(key);
        combinedList.push({
            _id: u._id,
            id: u._id,
            sellerName: u.name,
            sellerPhone: u.phone || 'N/A',
            sellerDistrict: u.district || 'Bangladesh',
            status: u.isVerifiedSeller ? 'Verified' : u.status || 'Pending',
            isUser: true,
            email: u.email,
        });
    });

    // Add products with unique seller info
    productsWithSellers.forEach((p) => {
        const key = p.seller?._id ? p.seller._id.toString() : `${p.sellerName}-${p.sellerDistrict}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            combinedList.push({
                _id: p._id,
                id: p._id,
                sellerName: p.sellerName || p.seller?.name || 'Agro / Fish Hatchery',
                sellerPhone: p.sellerPhone || p.seller?.phone || 'N/A',
                sellerDistrict: p.sellerDistrict || 'Bangladesh',
                status: p.seller?.isVerifiedSeller ? 'Verified' : 'Verified',
                isUser: false,
            });
        }
    });

    res.status(200).json({
        success: true,
        count: combinedList.length,
        data: combinedList,
    });
});

/**
 * Get all users with filters and pagination (Admin only)
 */
export const getAllUsers = catchAsync(async (req, res) => {
    const { role, status, isVerifiedSeller, search, page = 1, limit = 50, sort } = req.query;

    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') filter.status = status;
    if (isVerifiedSeller !== undefined && isVerifiedSeller !== 'all') {
        filter.isVerifiedSeller = isVerifiedSeller === 'true' || isVerifiedSeller === true;
    }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };
    else if (sort === 'name_desc') sortOption = { name: -1 };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: users.length,
        users,
    });
});

/**
 * Get single user by ID (Admin only)
 */
export const getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        user,
    });
});

/**
 * Admin create user with specified role and status (Admin only)
 */
export const createUserByAdmin = catchAsync(async (req, res) => {
    const { name, email, password, role, status, phone, avatar, isVerifiedSeller } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Name is required', 400);
    }
    if (!email || !email.trim()) {
        throw new AppError('Email is required', 400);
    }
    if (!password || password.length < 6) {
        throw new AppError('Password must be at least 6 characters', 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
        throw new AppError('Email is already registered by another user', 400);
    }

    const validRoles = ['Admin', 'Seller', 'Customer'];
    const validStatuses = ['Active', 'Inactive'];

    if (role && !validRoles.includes(role)) {
        throw new AppError(`Invalid role. Valid options: ${validRoles.join(', ')}`, 400);
    }
    if (status && !validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Valid options: ${validStatuses.join(', ')}`, 400);
    }

    const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: role || 'Customer',
        status: status || 'Active',
        phone: phone ? phone.trim() : '',
        avatar: avatar || null,
        isVerifiedSeller: isVerifiedSeller !== undefined ? Boolean(isVerifiedSeller) : false,
    });

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        user,
    });
});

/**
 * Update user details (Admin only)
 */
export const updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, status, phone, avatar, password, isVerifiedSeller } = req.body;

    const user = await User.findById(id).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (email && email.toLowerCase().trim() !== user.email) {
        const cleanEmail = email.toLowerCase().trim();
        const existingEmail = await User.findOne({
            email: cleanEmail,
            _id: { $ne: id },
        });
        if (existingEmail) {
            throw new AppError('Email is already taken by another user', 400);
        }
        user.email = cleanEmail;
    }

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) {
        const validRoles = ['Admin', 'Seller', 'Customer'];
        if (!validRoles.includes(role)) {
            throw new AppError(`Invalid role: ${role}`, 400);
        }
        user.role = role;
    }
    if (status !== undefined) {
        const validStatuses = ['Active', 'Inactive'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status: ${status}`, 400);
        }
        user.status = status;
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (isVerifiedSeller !== undefined) {
        user.isVerifiedSeller = Boolean(isVerifiedSeller);
    }
    if (password) {
        if (password.length < 6) {
            throw new AppError('Password must be at least 6 characters', 400);
        }
        user.password = password;
    }

    await user.save();

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user,
    });
});



/**
 * Delete a user by ID (Admin only)
 */
export const deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (req.user.id === id) {
        throw new AppError('You cannot delete your own admin account.', 400);
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        deletedId: id,
    });
});

/**
 * Admin change password of another user (Admin only)
 */
export const changeUserPasswordByAdmin = catchAsync(async (req, res) => {
    const { userId, newPassword } = req.body;
    const targetId = userId || req.params.id;

    if (!targetId || !newPassword) {
        throw new AppError('User ID and new password are required', 400);
    }
    if (newPassword.length < 6) {
        throw new AppError('New password must be at least 6 characters long', 400);
    }

    const user = await User.findById(targetId).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: `Password updated for ${user.name}`,
    });
});

/* ─────────────────────────────────────────────────────────────
 * 3. CATEGORY ADMIN CONTROLLER FUNCTIONS
 * ───────────────────────────────────────────────────────────── */

/**
 * Create a new category (Admin)
 */
export const createCategory = catchAsync(async (req, res) => {
    const { name, description = '', subcategories = [] } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Category name is required.', 400);
    }

    const categories = readCategories();
    const slug = toSlug(name.trim());

    const exists = categories.some((c) => c.slug === slug);
    if (exists) {
        throw new AppError(`A category with the slug "${slug}" already exists.`, 409);
    }

    const newCategory = {
        name: name.trim(),
        slug,
        description: description.trim(),
        product_count: 0,
        subcategories: Array.isArray(subcategories) ? subcategories : [],
    };

    categories.push(newCategory);
    writeCategories(categories);

    res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        category: newCategory,
    });
});

/**
 * Update a category (Admin)
 */
export const updateCategory = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { name, description, subcategories } = req.body;

    const categories = readCategories();
    const index = categories.findIndex((c) => c.slug === slug);

    if (index === -1) {
        throw new AppError(`Category with slug "${slug}" not found.`, 404);
    }

    const existing = categories[index];

    // Compute a new slug if the name changed
    const updatedName = name ? name.trim() : existing.name;
    const updatedSlug = name ? toSlug(updatedName) : slug;

    // Guard against slug collision with another category
    if (updatedSlug !== slug) {
        const collision = categories.some((c, i) => i !== index && c.slug === updatedSlug);
        if (collision) {
            throw new AppError(`Another category with the slug "${updatedSlug}" already exists.`, 409);
        }
    }

    categories[index] = {
        ...existing,
        name: updatedName,
        slug: updatedSlug,
        description: description !== undefined ? description.trim() : existing.description,
        subcategories: subcategories !== undefined
            ? (Array.isArray(subcategories) ? subcategories : existing.subcategories)
            : existing.subcategories,
    };

    writeCategories(categories);

    res.status(200).json({
        success: true,
        message: 'Category updated successfully.',
        category: categories[index],
    });
});

/**
 * Delete a category (Admin only)
 */
export const deleteCategory = catchAsync(async (req, res) => {
    const { slug } = req.params;

    const categories = readCategories();
    const index = categories.findIndex((c) => c.slug === slug);

    if (index === -1) {
        throw new AppError(`Category with slug "${slug}" not found.`, 404);
    }

    const [deleted] = categories.splice(index, 1);
    writeCategories(categories);

    res.status(200).json({
        success: true,
        message: `Category "${deleted.name}" deleted successfully.`,
    });
});

/* ─────────────────────────────────────────────────────────────
 * 4. ORDER ADMIN CONTROLLER FUNCTIONS
 * ───────────────────────────────────────────────────────────── */

/**
 * Get all Orders (Admin / Seller) with search, filter, and pagination
 */
export const getAllOrdersAdmin = catchAsync(async (req, res) => {
    const { status, paymentStatus, search, page = 1, limit = 50, sort } = req.query;

    const filter = {};
    if (status && status !== 'all') {
        filter.status = status;
    }
    if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
    } else {
        // By default, exclude orders with failed payments (abandoned attempts)
        filter.paymentStatus = { $ne: 'failed' };
    }
    if (search) {
        filter.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { city: { $regex: search, $options: 'i' } },
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'total_desc') sortOption = { total: -1 };
    else if (sort === 'total_asc') sortOption = { total: 1 };

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: orders.length,
        orders,
    });
});

/**
 * Get single Order details (Admin / Seller)
 */
export const getAdminOrderById = catchAsync(async (req, res) => {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id).populate('customer', 'name email phone role');
    }
    if (!order) {
        order = await Order.findOne({ orderId: id.toUpperCase().trim() }).populate('customer', 'name email phone role');
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    res.status(200).json({
        success: true,
        order,
    });
});

/**
 * Update Order status / payment status (Seller / Admin)
 */
export const updateOrderStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id);
    }
    if (!order) {
        order = await Order.findOne({ orderId: id.toUpperCase().trim() });
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    if (status) {
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid order status. Allowed: ${validStatuses.join(', ')}`, 400);
        }
        order.status = status;
    }

    if (paymentStatus) {
        const validPaymentStatuses = ['pending', 'paid', 'failed'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            throw new AppError(`Invalid payment status. Allowed: ${validPaymentStatuses.join(', ')}`, 400);
        }
        order.paymentStatus = paymentStatus;
    }

    if (notes !== undefined) {
        order.notes = notes.trim();
    }

    await order.save();

    res.status(200).json({
        success: true,
        message: 'Order status updated successfully.',
        order,
    });
});

/**
 * Delete an Order (Admin only)
 */
export const deleteOrder = catchAsync(async (req, res) => {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findByIdAndDelete(id);
    }
    if (!order) {
        order = await Order.findOneAndDelete({ orderId: id.toUpperCase().trim() });
    }

    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    res.status(200).json({
        success: true,
        message: 'Order deleted successfully.',
        deletedId: id,
    });
});

/* ─────────────────────────────────────────────────────────────
 * 5. BLOG ADMIN CONTROLLER FUNCTIONS
 * ───────────────────────────────────────────────────────────── */

/**
 * Create a new Blog post (Admin / Seller)
 */
export const createBlog = catchAsync(async (req, res) => {
    const { title, description, content, videoUrl: rawVideoUrl, tags: rawTags, isPublished } = req.body;

    if (!title || !title.trim()) {
        throw new AppError('Blog title is required.', 400);
    }
    if (title.trim().length > 150) {
        throw new AppError('Blog title must be 150 characters or fewer.', 400);
    }
    if (!description || !description.trim()) {
        throw new AppError('Blog description is required.', 400);
    }
    if (!content || !content.trim()) {
        throw new AppError('Blog content is required.', 400);
    }

    // Determine thumbnail path
    let thumbnail = '';
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnail = `/uploads/blogs/${req.files.thumbnail[0].filename}`;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string') {
        thumbnail = req.body.thumbnail.trim();
    }

    if (!thumbnail) {
        throw new AppError('A thumbnail image is required.', 400);
    }

    // Determine video URL
    let videoUrl = rawVideoUrl ? rawVideoUrl.trim() : null;
    if (req.files && req.files.videoFile && req.files.videoFile[0]) {
        videoUrl = `/uploads/blog-videos/${req.files.videoFile[0].filename}`;
    }

    // Parse tags
    let tags = [];
    if (Array.isArray(rawTags)) {
        tags = rawTags;
    } else if (typeof rawTags === 'string') {
        tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Generate unique slug
    const baseSlug = slugify(title) || 'blog';
    let slug = baseSlug;
    let suffix = 2;
    while (await Blog.exists({ slug })) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }

    const blog = await Blog.create({
        title: title.trim(),
        slug,
        description: description.trim(),
        content: content.trim(),
        thumbnail,
        videoUrl,
        tags,
        author: req.user?.id || null,
        isPublished: isPublished === undefined ? true : isPublished === 'true' || isPublished === true,
    });

    res.status(201).json({
        success: true,
        message: `“${blog.title}” has been published.`,
        data: blog,
    });
});

/**
 * Update Blog by ID (Admin / Seller)
 */
export const updateBlog = catchAsync(async (req, res) => {
    const { id } = req.params;

    let blog = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        blog = await Blog.findById(id);
    }
    if (!blog) {
        blog = await Blog.findOne({ slug: id });
    }

    if (!blog) {
        throw new AppError('This blog no longer exists.', 404);
    }

    const { title, description, content, videoUrl: rawVideoUrl, tags: rawTags, isPublished } = req.body;

    // Handle thumbnail replacement
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        const newThumbnail = `/uploads/blogs/${req.files.thumbnail[0].filename}`;
        await removeUploadedFile(blog.thumbnail);
        blog.thumbnail = newThumbnail;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string' && req.body.thumbnail !== blog.thumbnail) {
        blog.thumbnail = req.body.thumbnail.trim();
    }

    // Handle video replacement
    if (req.files && req.files.videoFile && req.files.videoFile[0]) {
        const newVideo = `/uploads/blog-videos/${req.files.videoFile[0].filename}`;
        if (blog.videoUrl) await removeUploadedFile(blog.videoUrl);
        blog.videoUrl = newVideo;
    } else if (rawVideoUrl !== undefined) {
        blog.videoUrl = rawVideoUrl ? rawVideoUrl.trim() : null;
    }

    // Update title and regenerate slug if changed
    if (title && title.trim() !== blog.title) {
        const baseSlug = slugify(title) || 'blog';
        let slug = baseSlug;
        let suffix = 2;
        while (await Blog.exists({ slug, _id: { $ne: blog._id } })) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        blog.title = title.trim();
        blog.slug = slug;
    }

    if (description !== undefined) blog.description = description.trim();
    if (content !== undefined) blog.content = content.trim();
    if (isPublished !== undefined) {
        blog.isPublished = isPublished === 'true' || isPublished === true;
    }

    if (rawTags !== undefined) {
        if (Array.isArray(rawTags)) {
            blog.tags = rawTags;
        } else if (typeof rawTags === 'string') {
            blog.tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
        }
    }

    await blog.save();

    res.status(200).json({
        success: true,
        message: 'Blog updated successfully',
        data: blog,
    });
});

/**
 * Delete Blog by ID (Admin only)
 */
export const deleteBlog = catchAsync(async (req, res) => {
    const { id } = req.params;

    let blog = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        blog = await Blog.findById(id);
    }
    if (!blog) {
        blog = await Blog.findOne({ slug: id });
    }

    if (!blog) {
        throw new AppError('This blog no longer exists.', 404);
    }

    // Delete local media files
    await removeUploadedFile(blog.thumbnail);
    if (blog.videoUrl) {
        await removeUploadedFile(blog.videoUrl);
    }

    await blog.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Blog deleted successfully',
        deletedId: id,
    });
});

/* ─────────────────────────────────────────────────────────────
 * 6. PRODUCT ADMIN CONTROLLER FUNCTIONS
 * ───────────────────────────────────────────────────────────── */

/**
 * Create a new Product (Admin / Seller)
 */
export const createProduct = catchAsync(async (req, res) => {
    const {
        name,
        description,
        category,
        unit,
        price,
        compareAtPrice,
        isAvailable,
        video,
        sellerName,
        sellerDistrict,
        sellerPhone,
    } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Product name is required.', 400);
    }
    if (name.trim().length > 120) {
        throw new AppError('Product name must be 120 characters or fewer.', 400);
    }
    if (!description || !description.trim()) {
        throw new AppError('Product description is required.', 400);
    }
    if (!category || !category.trim()) {
        throw new AppError('Category is required.', 400);
    }
    if (!unit || !unit.trim()) {
        throw new AppError('Unit is required.', 400);
    }

    const numericPrice = Number(price);
    if (!price || Number.isNaN(numericPrice) || numericPrice <= 0) {
        throw new AppError('Price must be a number greater than 0.', 400);
    }

    let numericComparePrice = null;
    if (compareAtPrice !== undefined && compareAtPrice !== '' && compareAtPrice !== null && compareAtPrice !== 'null') {
        numericComparePrice = Number(compareAtPrice);
        if (Number.isNaN(numericComparePrice) || numericComparePrice <= 0) {
            throw new AppError('Old price (compareAtPrice) must be a number greater than 0.', 400);
        }
        if (numericComparePrice <= numericPrice) {
            throw new AppError('Old price (compareAtPrice) must be higher than current price.', 400);
        }
    }

    // Determine thumbnail path
    let thumbnail = '';
    if (req.file) {
        thumbnail = `/uploads/products/${req.file.filename}`;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string') {
        thumbnail = req.body.thumbnail.trim();
    }

    if (!thumbnail) {
        throw new AppError('A product thumbnail image is required.', 400);
    }

    // Generate unique slug
    const baseSlug = slugify(name) || 'product';
    let slug = baseSlug;
    let suffix = 2;
    while (await Product.exists({ slug })) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }

    const product = await Product.create({
        name: name.trim(),
        slug,
        description: description.trim(),
        category: category.trim(),
        unit: unit.trim(),
        price: numericPrice,
        compareAtPrice: numericComparePrice,
        thumbnail,
        video: video ? video.trim() : null,
        sellerName: sellerName ? sellerName.trim() : null,
        sellerDistrict: sellerDistrict ? sellerDistrict.trim() : null,
        sellerPhone: sellerPhone ? sellerPhone.trim() : null,
        isAvailable: isAvailable === undefined ? true : isAvailable === 'true' || isAvailable === true,
    });

    res.status(201).json({
        success: true,
        message: `“${product.name}” has been added.`,
        data: product,
    });
});

/**
 * Update Product by ID (Admin / Seller)
 */
export const updateProduct = catchAsync(async (req, res) => {
    const { id } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id);
    }
    if (!product) {
        product = await Product.findOne({ slug: id });
    }

    if (!product) {
        throw new AppError('This product no longer exists.', 404);
    }

    const {
        name,
        description,
        category,
        unit,
        price,
        compareAtPrice,
        isAvailable,
        video,
        sellerName,
        sellerDistrict,
        sellerPhone,
    } = req.body;

    // If new thumbnail uploaded, replace and delete old file
    if (req.file) {
        const newThumbnail = `/uploads/products/${req.file.filename}`;
        await removeUploadedFile(product.thumbnail);
        product.thumbnail = newThumbnail;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string' && req.body.thumbnail !== product.thumbnail) {
        product.thumbnail = req.body.thumbnail.trim();
    }

    // Update name and regenerate slug if changed
    if (name && name.trim() !== product.name) {
        const baseSlug = slugify(name) || 'product';
        let slug = baseSlug;
        let suffix = 2;
        while (await Product.exists({ slug, _id: { $ne: product._id } })) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        product.name = name.trim();
        product.slug = slug;
    }

    if (description !== undefined) product.description = description.trim();
    if (category !== undefined) product.category = category.trim();
    if (unit !== undefined) product.unit = unit.trim();
    if (video !== undefined) product.video = video ? video.trim() : null;
    if (sellerName !== undefined) product.sellerName = sellerName ? sellerName.trim() : null;
    if (sellerDistrict !== undefined) product.sellerDistrict = sellerDistrict ? sellerDistrict.trim() : null;
    if (sellerPhone !== undefined) product.sellerPhone = sellerPhone ? sellerPhone.trim() : null;

    if (isAvailable !== undefined) {
        product.isAvailable = isAvailable === 'true' || isAvailable === true;
    }

    if (price !== undefined) {
        const numericPrice = Number(price);
        if (Number.isNaN(numericPrice) || numericPrice <= 0) {
            throw new AppError('Price must be greater than 0.', 400);
        }
        product.price = numericPrice;
    }

    if (compareAtPrice !== undefined) {
        if (compareAtPrice === '' || compareAtPrice === null || compareAtPrice === 'null') {
            product.compareAtPrice = null;
        } else {
            const numericComparePrice = Number(compareAtPrice);
            if (Number.isNaN(numericComparePrice) || numericComparePrice <= 0) {
                throw new AppError('Old price must be greater than 0.', 400);
            }
            if (numericComparePrice <= product.price) {
                throw new AppError('Old price must be higher than current price.', 400);
            }
            product.compareAtPrice = numericComparePrice;
        }
    }

    await product.save();

    res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
    });
});

/**
 * Delete Product by ID (Admin only)
 */
export const deleteProduct = catchAsync(async (req, res) => {
    const { id } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id);
    }
    if (!product) {
        product = await Product.findOne({ slug: id });
    }

    if (!product) {
        throw new AppError('This product no longer exists.', 404);
    }

    // Delete associated uploaded image
    await removeUploadedFile(product.thumbnail);

    await product.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        deletedId: id,
    });
});

/**
 * Approve or toggle seller verification status
 */
export const approveSeller = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findById(id);
    if (!user) {
        throw new AppError('Seller not found', 404);
    }

    if (status === 'Verified') {
        user.isVerifiedSeller = true;
        if (user.status !== 'Inactive') user.status = 'Active';
    } else {
        user.isVerifiedSeller = false;
    }

    await user.save();

    res.status(200).json({
        success: true,
        message: `Seller status updated to ${status}`,
        data: user,
    });
});

/* ─────────────────────────────────────────────────────────────
 * 7. PASS-THROUGH / RE-EXPORTS FOR ADMIN ROUTE CONVENIENCE
 * ───────────────────────────────────────────────────────────── */
export { getAllBlogs, getBlogByIdOrSlug } from './blog.controller.js';
export { getAllProducts, getProductByIdOrSlug } from './product.controller.js';
