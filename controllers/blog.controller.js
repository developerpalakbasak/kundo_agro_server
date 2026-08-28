import mongoose from 'mongoose';
import Blog from '../model/blog.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import slugify from '../utils/slugify.js';
import { removeUploadedFile } from '../middleware/upload.middleware.js';

/**
 * Create a new Blog post (Admin / Staff / Manager)
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

/**
 * Update Blog by ID (Admin / Staff / Manager)
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
 * Delete Blog by ID (Admin / Manager only)
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
