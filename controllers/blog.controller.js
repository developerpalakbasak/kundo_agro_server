import mongoose from 'mongoose';
import Blog from '../model/blog.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';


/**
 * Get all Blogs with filtering, search, and pagination (Public / Customer / Admin)
 */
export const getAllBlogs = catchAsync(async (req, res) => {
    const { tag, search, isPublished, page = 1, limit = 50, sort } = req.query;

    const filter = {};

    if (tag && tag !== 'all') {
        filter.tags = tag;
    }

    if (isPublished !== undefined) {
        filter.isPublished = isPublished === 'true' || isPublished === true;
    }

    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $regex: search, $options: 'i' } },
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'title_asc') sortOption = { title: 1 };
    else if (sort === 'title_desc') sortOption = { title: -1 };

    const total = await Blog.countDocuments(filter);
    const blogs = await Blog.find(filter)
        .populate('author', 'name email avatar')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: blogs.length,
        data: blogs,
    });
});

/**
 * Get all distinct blog tags
 */
export const getBlogTags = catchAsync(async (req, res) => {
    const tags = await Blog.distinct('tags');
    res.status(200).json({
        success: true,
        tags: tags.filter(Boolean),
    });
});

/**
 * Get single Blog by ID or Slug
 */
export const getBlogByIdOrSlug = catchAsync(async (req, res) => {
    const { idOrSlug } = req.params;

    let blog = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        blog = await Blog.findById(idOrSlug).populate('author', 'name email avatar');
    }

    if (!blog) {
        blog = await Blog.findOne({ slug: idOrSlug }).populate('author', 'name email avatar');
    }

    if (!blog) {
        throw new AppError('Blog not found', 404);
    }

    res.status(200).json({
        success: true,
        data: blog,
    });
});

