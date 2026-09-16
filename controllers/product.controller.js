import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Product from '../model/product.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import slugify from '../utils/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DISTRICTS_FILE = join(__dirname, '../data/bangladesh_districts.json');
const UNITS_FILE = join(__dirname, '../data/product_units.json');

const readJSONFile = (filePath) => {
    try {
        const raw = readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

/**
 * Get all Bangladesh districts (from bangladesh_districts.json)
 */
export const getAllDistricts = catchAsync(async (req, res) => {
    const districts = readJSONFile(DISTRICTS_FILE);
    res.status(200).json({
        success: true,
        count: districts.length,
        districts,
    });
});

/**
 * Get all Product Units (from product_units.json)
 */
export const getAllUnits = catchAsync(async (req, res) => {
    const units = readJSONFile(UNITS_FILE);
    res.status(200).json({
        success: true,
        count: units.length,
        units,
    });
});

/**
 * Standard Product Categories
 */
export const DEFAULT_PRODUCT_CATEGORIES = [
    'Fish seed / মাছের পোনা',
    'Fisheries medicine / chemical',
    'Dairy medicine',
    'Human food',
    'Fish feed / raw materials',
    'Dairy feed / raw materials',
    'Import items',
];


/**
 * Customer / Seller submission for Fish Seed product
 */
export const createFishSeedProduct = catchAsync(async (req, res) => {
    const {
        name,
        description,
        price,
        unit = 'piece',
        sellerName,
        sellerDistrict,
        sellerPhone,
        imageUrl,
    } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Product name is required / পণ্যের নাম আবশ্যক।', 400);
    }
    if (!sellerName || !sellerName.trim()) {
        throw new AppError('Seller name is required / বিক্রেতার নাম আবশ্যক।', 400);
    }
    if (!sellerDistrict || !sellerDistrict.trim()) {
        throw new AppError('Seller district is required / জেলা নির্বাচন করুন।', 400);
    }
    if (!sellerPhone || !sellerPhone.trim()) {
        throw new AppError('Contact phone number is required / মোবাইল নম্বর আবশ্যক।', 400);
    }

    const numericPrice = Number(price);
    if (!price || Number.isNaN(numericPrice) || numericPrice <= 0) {
        throw new AppError('Please enter a valid price / সঠিক মূল্য লিখুন।', 400);
    }

    let thumbnail = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80';
    if (req.file) {
        thumbnail = `/uploads/products/${req.file.filename}`;
    } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
        thumbnail = imageUrl.trim();
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string' && req.body.thumbnail.trim()) {
        thumbnail = req.body.thumbnail.trim();
    }

    const baseSlug = slugify(name) || 'fish-seed';
    let slug = baseSlug;
    let suffix = 2;
    while (await Product.exists({ slug })) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }

    const product = await Product.create({
        name: name.trim(),
        slug,
        description: description ? description.trim() : `Quality fish seed supplied by ${sellerName} from ${sellerDistrict}.`,
        category: 'Fish seed / মাছের পোনা',
        unit: unit.trim(),
        price: numericPrice,
        compareAtPrice: null,
        thumbnail,
        sellerName: sellerName.trim(),
        sellerDistrict: sellerDistrict.trim(),
        sellerPhone: sellerPhone.trim(),
        isAvailable: true,
    });

    res.status(201).json({
        success: true,
        message: 'Fish seed product posted successfully.',
        data: product,
    });
});

/**
 * Get all Products with filtering, search, and pagination (Public / Customer / Admin)
 */
export const getAllProducts = catchAsync(async (req, res) => {
    const { category, search, unit, minPrice, maxPrice, isAvailable, sort, page = 1, limit = 50 } = req.query;

    const filter = {};

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
            { sellerName: { $regex: search, $options: 'i' } },
            { sellerDistrict: { $regex: search, $options: 'i' } },
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
        data: products,
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
        data: product,
    });
});



