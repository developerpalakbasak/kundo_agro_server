import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import catchAsync from '../utils/catchAsync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATEGORY_FILE = join(__dirname, '../data/category.json');

/**
 * Read categories from the JSON file.
 */
const readCategories = () => {
    const raw = readFileSync(CATEGORY_FILE, 'utf-8');
    return JSON.parse(raw);
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/admin/category/get-all
// ─────────────────────────────────────────────────────────────
export const getAllCategories = catchAsync(async (req, res) => {
    const categories = readCategories();

    res.status(200).json({
        success: true,
        count: categories.length,
        categories,
    });
});

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

// ─────────────────────────────────────────────────────────────
// POST /api/v1/products/categories
// ─────────────────────────────────────────────────────────────
export const createCategory = catchAsync(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const categories = readCategories();
    const finalName = name.trim();
    const slug = toSlug(finalName);
    const exists = categories.some((c) => c.slug === slug);

    if (!exists) {
        categories.push({
            name: finalName,
            slug,
            description: "",
            product_count: 0,
            subcategories: []
        });
        writeCategories(categories);
    }

    res.status(201).json({
        success: true,
        message: exists ? 'Category already exists' : 'Category created successfully',
        category: finalName,
        slug
    });
});


