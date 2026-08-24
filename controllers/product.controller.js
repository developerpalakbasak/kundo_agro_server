import mongoose from 'mongoose';
import Product from '../model/product.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import slugify from '../utils/slugify.js';
import { removeUploadedFile } from '../middleware/upload.middleware.js';

/**
 * Create a new Product
 */
export const createProduct = catchAsync(async (req, res) => {
    const { name, description, category, unit, price, compareAtPrice, isAvailable, video } = req.body;

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
    if (compareAtPrice !== undefined && compareAtPrice !== '' && compareAtPrice !== null) {
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
        isAvailable: isAvailable === undefined ? true : isAvailable === 'true' || isAvailable === true
    });

    res.status(201).json({
        success: true,
        message: `“${product.name}” has been added.`,
        data: product
    });
});

/**
 * Get all Products with filtering, search, and pagination
 */
export const getAllProducts = catchAsync(async (req, res) => {
    const { category, search, unit, minPrice, maxPrice, isAvailable, sort, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (category) {
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
            { category: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
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
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: products.length,
        data: products
    });
});

/**
 * Get single Product by ID or Slug
 */
export const getProductByIdOrSlug = catchAsync(async (req, res) => {
    const { idOrSlug } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        product = await Product.findById(idOrSlug);
    }

    if (!product) {
        product = await Product.findOne({ slug: idOrSlug });
    }

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    res.status(200).json({
        success: true,
        data: product
    });
});

/**
 * Update Product by ID (Supports multipart image upload and text fields)
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

    const { name, description, category, unit, price, compareAtPrice, isAvailable, video } = req.body;

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
        data: product
    });
});

/**
 * Delete Product by ID
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
        deletedId: id
    });
});
