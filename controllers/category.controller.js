import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import AppError from '../utils/appError.js';
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

/**
 * Persist categories back to the JSON file.
 */
const writeCategories = (data) => {
    writeFileSync(CATEGORY_FILE, JSON.stringify(data, null, 4), 'utf-8');
};

/**
 * Simple slug generator (mirrors the project's existing utility style).
 */
const toSlug = (text) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');

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

// ─────────────────────────────────────────────────────────────
// POST /api/v1/admin/category/create
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/admin/category/update/:slug
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/admin/category/delete/:slug
// ─────────────────────────────────────────────────────────────
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
