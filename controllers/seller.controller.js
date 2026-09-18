import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Product from '../model/product.model.js';
import Order from '../model/order.model.js';
import User from '../model/user.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import slugify from '../utils/slugify.js';
import { decodeToken, generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { setAuthCookies } from '../utils/response.js';
import { removeUploadedFile } from '../middleware/upload.middleware.js';

/**
 * Helper to reliably resolve the authenticated seller/user instance from req.user,
 * cookies (accessToken, token, customerAccessToken, refreshToken) or Authorization Bearer header.
 */
export const getSellerUser = async (req) => {
    // 1. From req.user if populated
    if (req.user?._id || req.user?.id) {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);
        if (user && user.status !== 'Inactive') return user;
    }

    // 2. Extract from cookies or Authorization header (fallback matching auth.middleware)
    let token = req.cookies?.accessToken || req.cookies?.token || req.cookies?.customerAccessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (token) {
        try {
            const decoded = decodeToken(token);
            if (decoded?.id) {
                const user = await User.findById(decoded.id);
                if (user && user.status !== 'Inactive') return user;
            }
        } catch {
            // Token expired or invalid, fallback to refreshToken
        }
    }

    if (refreshToken) {
        try {
            const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
            const userId = decodedRefresh.userId || decodedRefresh.id;
            if (userId) {
                const user = await User.findById(userId);
                if (user && user.status !== 'Inactive') return user;
            }
        } catch {
            // Refresh token invalid
        }
    }

    return null;
};

/**
 * 1. Get Seller Dashboard Statistics
 * Aggregates statistics specifically for the individual logged-in seller.
 */
export const getSellerDashboardStats = catchAsync(async (req, res) => {
    const seller = await getSellerUser(req);
    if (!seller) {
        throw new AppError('Authentication required. Seller information not found.', 401);
    }

    const sellerId = seller._id;

    // Filter strictly for this individual seller's products
    const sellerProducts = await Product.find({ seller: sellerId })
        .sort({ createdAt: -1 })
        .populate('seller', 'name email phone avatar')
        .lean();

    const productIds = sellerProducts.map((p) => p._id);

    const totalProducts = sellerProducts.length;
    const availableProducts = sellerProducts.filter((p) => p.isAvailable).length;
    const outOfStockProducts = totalProducts - availableProducts;

    // Fetch orders containing this seller's products
    const matchingOrders = productIds.length > 0
        ? await Order.find({ 'items.product': { $in: productIds } })
            .sort({ createdAt: -1 })
            .lean()
        : [];

    const totalOrders = matchingOrders.length;

    // Order status breakdown & revenue calculation
    const orderStatuses = {
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
    };

    let totalRevenue = 0;

    matchingOrders.forEach((order) => {
        if (order.status && Object.prototype.hasOwnProperty.call(orderStatuses, order.status)) {
            orderStatuses[order.status] += 1;
        }

        // Calculate seller-specific earnings (excluding cancelled orders)
        if (order.status !== 'cancelled' && Array.isArray(order.items)) {
            order.items.forEach((item) => {
                if (item.product && productIds.some((id) => id.toString() === item.product.toString())) {
                    totalRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
                }
            });
        }
    });

    const recentOrders = matchingOrders.slice(0, 5).map((order) => ({
        _id: order._id,
        orderId: order.orderId || order._id,
        customerName: order.customerName,
        phone: order.phone,
        status: order.status,
        createdAt: order.createdAt,
        items: (order.items || []).filter(
            (item) => item.product && productIds.some((id) => id.toString() === item.product.toString())
        ),
    }));

    res.status(200).json({
        success: true,
        data: {
            seller: {
                id: seller._id,
                name: seller.name,
                email: seller.email,
                phone: seller.phone || '',
                role: seller.role,
            },
            stats: {
                totalProducts,
                availableProducts,
                outOfStock: outOfStockProducts,
                totalOrders,
                totalRevenue,
            },
            breakdown: {
                orderStatuses,
            },
            products: sellerProducts,
            recent: {
                products: sellerProducts.slice(0, 5),
                orders: recentOrders,
            },
        },
    });
});

/**
 * 2. Get Seller Products
 * Lists all products owned by the authenticated seller with filtering, search, and pagination.
 */
export const getSellerProducts = catchAsync(async (req, res) => {
    const seller = await getSellerUser(req);
    if (!seller) {
        throw new AppError('Authentication required. Seller information not found.', 401);
    }

    const {
        search,
        category,
        unit,
        isAvailable,
        minPrice,
        maxPrice,
        sort,
        page = 1,
        limit = 20,
    } = req.query;

    // Filter by seller (Admins can optionally view all or filter by a specific seller)
    const filter = {};
    if (seller.role === 'Admin' && req.query.all === 'true') {
        if (req.query.seller) filter.seller = req.query.seller;
    } else {
        filter.seller = seller._id;
    }

    if (category && category !== 'all') {
        filter.category = category;
    }

    if (unit) {
        filter.unit = unit;
    }

    if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable === 'true' || isAvailable === true;
    }

    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };
    else if (sort === 'name_desc') sortOption = { name: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
        .populate('seller', 'name email phone avatar role')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: products.length,
        data: products,
    });
});

/**
 * 3. Get Single Seller Product by ID or Slug
 */
export const getSellerProductById = catchAsync(async (req, res) => {
    const seller = await getSellerUser(req);
    if (!seller) {
        throw new AppError('Authentication required. Seller information not found.', 401);
    }

    const { idOrSlug } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        product = await Product.findById(idOrSlug).populate('seller', 'name email phone avatar role');
    }

    if (!product) {
        product = await Product.findOne({ slug: idOrSlug }).populate('seller', 'name email phone avatar role');
    }

    if (!product) {
        throw new AppError('Product not found.', 404);
    }

    // Ownership check (Admins can view any)
    const productSellerId = product.seller?._id || product.seller;
    if (seller.role !== 'Admin' && (!productSellerId || productSellerId.toString() !== seller._id.toString())) {
        throw new AppError('You do not have permission to access this product.', 403);
    }

    res.status(200).json({
        success: true,
        data: product,
    });
});

/**
 * 4. Create Product (Seller)
 */
export const createSellerProduct = catchAsync(async (req, res) => {
    const seller = await getSellerUser(req);
    if (!seller) {
        throw new AppError('Authentication required. Seller information not found.', 401);
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
        location,
        sellerDistrict, // Fallback compatibility
        productFor,
    } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Product name is required.', 400);
    }
    if (name.trim().length > 120) {
        throw new AppError('Product name must be 120 characters or fewer.', 400);
    }
    if (!productFor || !['fish', 'animale'].includes(productFor.trim())) {
        throw new AppError('Valid product type (fish or animale) is required.', 400);
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
    } else if (req.body.imageUrl && typeof req.body.imageUrl === 'string') {
        thumbnail = req.body.imageUrl.trim();
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

    // Determine location
    const productLocation = (location || sellerDistrict || '').trim() || null;

    const product = await Product.create({
        name: name.trim(),
        slug,
        description: description.trim(),
        category: category.trim(),
        unit: unit.trim(),
        price: numericPrice,
        productFor: productFor.trim(),
        compareAtPrice: numericComparePrice,
        thumbnail,
        video: video ? video.trim() : null,
        seller: seller._id,
        location: productLocation,
        isAvailable: isAvailable === undefined ? true : isAvailable === 'true' || isAvailable === true,
    });

    const populatedProduct = await Product.findById(product._id).populate('seller', 'name email phone avatar role status');

    res.status(201).json({
        success: true,
        message: `“${product.name}” has been added successfully.`,
        data: populatedProduct,
    });
});

/**
 * 5. Update Product (Seller)
 */
export const updateSellerProduct = catchAsync(async (req, res) => {
    const seller = await getSellerUser(req);
    if (!seller) {
        throw new AppError('Authentication required. Seller information not found.', 401);
    }

    const { id } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id);
    }
    if (!product) {
        product = await Product.findOne({ slug: id });
    }

    if (!product) {
        throw new AppError('Product not found.', 404);
    }

    // Ownership check (Admins can update any product)
    const productSellerId = product.seller?._id || product.seller;
    if (seller.role !== 'Admin' && (!productSellerId || productSellerId.toString() !== seller._id.toString())) {
        throw new AppError('You do not have permission to edit this product.', 403);
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
        location,
        sellerDistrict,
        productFor,
    } = req.body;

    // Handle thumbnail replacement
    if (req.file) {
        const newThumbnail = `/uploads/products/${req.file.filename}`;
        await removeUploadedFile(product.thumbnail);
        product.thumbnail = newThumbnail;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string' && req.body.thumbnail !== product.thumbnail) {
        product.thumbnail = req.body.thumbnail.trim();
    }

    // Update name and slug if modified
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
    
    if (productFor !== undefined) {
        if (!['fish', 'animale'].includes(productFor.trim())) {
            throw new AppError('Valid product type (fish or animale) is required.', 400);
        }
        product.productFor = productFor.trim();
    }

    if (location !== undefined) {
        product.location = location ? location.trim() : null;
    } else if (sellerDistrict !== undefined) {
        product.location = sellerDistrict ? sellerDistrict.trim() : null;
    }

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
                throw new AppError('Old price (compareAtPrice) must be higher than current price.', 400);
            }
            product.compareAtPrice = numericComparePrice;
        }
    }

    await product.save();
    const updatedProduct = await Product.findById(product._id).populate('seller', 'name email phone avatar role status');

    res.status(200).json({
        success: true,
        message: `“${product.name}” updated successfully.`,
        data: updatedProduct,
    });
});

/**
 * 6. Delete Product (Seller)
 */
export const deleteSellerProduct = catchAsync(async (req, res) => {
    const seller = await getSellerUser(req);
    if (!seller) {
        throw new AppError('Authentication required. Seller information not found.', 401);
    }

    const { id } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id);
    }
    if (!product) {
        product = await Product.findOne({ slug: id });
    }

    if (!product) {
        throw new AppError('Product not found.', 404);
    }

    // Ownership check (Admins can delete any product)
    const productSellerId = product.seller?._id || product.seller;
    if (seller.role !== 'Admin' && (!productSellerId || productSellerId.toString() !== seller._id.toString())) {
        throw new AppError('You do not have permission to delete this product.', 403);
    }

    // Remove local uploaded thumbnail
    await removeUploadedFile(product.thumbnail);

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
        success: true,
        message: `“${product.name}” deleted successfully.`,
    });
});

/**
 * 7. Create Seller Account
 * Allows a new or existing user to register as a seller with isVerifiedSeller: false.
 * Admin approval is required to set isVerifiedSeller: true.
 */
export const createSellerAccount = catchAsync(async (req, res) => {
    // If user is already authenticated with valid session/cookies, disallow account creation
    if (req.user) {
        throw new AppError('You are already logged in with an active account. Please log out first before creating a new account.', 400);
    }

    const existingToken = req.cookies?.accessToken || req.cookies?.token || req.cookies?.customerAccessToken;
    const existingRefreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (existingToken) {
        try {
            const decoded = decodeToken(existingToken);
            if (decoded?.id) {
                const user = await User.findById(decoded.id);
                if (user && user.status !== 'Inactive') {
                    throw new AppError('You are already logged in with an active account. Please log out first before creating a new account.', 400);
                }
            }
        } catch (err) {
            if (err instanceof AppError) throw err;
        }
    }

    if (existingRefreshToken) {
        try {
            const decodedRefresh = jwt.verify(existingRefreshToken, process.env.JWT_SECRET);
            const userId = decodedRefresh.userId || decodedRefresh.id;
            if (userId) {
                const user = await User.findById(userId);
                if (user && user.status !== 'Inactive') {
                    throw new AppError('You are already logged in with an active account. Please log out first before creating a new account.', 400);
                }
            }
        } catch (err) {
            if (err instanceof AppError) throw err;
        }
    }

    const { name, email, password, phone, avatar, status, sellerFor } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Full name is required', 400);
    }
    if (!email || !email.trim()) {
        throw new AppError('Email address is required', 400);
    }
    if (!password || password.length < 6) {
        throw new AppError('Password is required and must be at least 6 characters', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
        throw new AppError('Email is already registered. Please use a different email or log in.', 400);
    }

    // Directly create seller account with role: 'Seller' and isVerifiedSeller: false
    const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'Seller',
        isVerifiedSeller: false,
        status: status || 'Active',
        phone: phone ? phone.trim() : '',
        avatar: avatar || null,
        sellerFor,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    setAuthCookies(
        req,
        res,
        accessToken,
        refreshToken,
        'Seller registration successful. Pending admin approval.',
        201,
        null,
        user
    );
});

export const createAccount = createSellerAccount;

// Aliases matching existing route names
export const getDashboardStats = getSellerDashboardStats;
export const getAllProducts = getSellerProducts;
export const getProductByIdOrSlug = getSellerProductById;
export const createProduct = createSellerProduct;
export const updateProduct = updateSellerProduct;
export const deleteProduct = deleteSellerProduct;

