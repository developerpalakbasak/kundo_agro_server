import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import Blog from "../../model/blog.model.js";
import slugify from "slugify";

export const createDemoBlogs = catchAsync(async (req, res) => {
    // Number of demo blogs to create (default 20, can be overridden via query param)
    const count = Number(req.query.count) || 20;

    // Helper generators
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const titles = [
        "The Future of Agriculture",
        "Sustainable Farming Practices",
        "Urban Gardening Tips",
        "Organic Food Benefits",
        "Tech Innovations in Farming",
        "How to Grow Herbs",
        "Seasonal Crop Guide",
        "Soil Health Explained",
        "Water Conservation Techniques",
        "Pest Management Strategies",
    ];
    const tagsPool = ["farming", "organic", "tech", "garden", "sustainability", "soil", "water", "pest", "crop", "harvest"];

    const blogs = [];
    for (let i = 0; i < count; i++) {
        const title = `${getRandom(titles)} ${i + 1}`;
        const description = `An insightful article about ${title.toLowerCase()}.`;
        const content = `## Introduction\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. ${title} provides valuable information for readers.`;
        const thumbnail = `https://picsum.photos/seed/blog${i}/800/600`;
        const videoUrl = Math.random() < 0.3 ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : null;
        const tags = Array.from({ length: getRandomInt(1, 3) }, () => getRandom(tagsPool));

        // Generate a unique slug
        const baseSlug = slugify(title) || 'blog';
        let slug = baseSlug;
        let suffix = 2;
        while (await Blog.exists({ slug })) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        blogs.push({
            title,
            slug,
            description,
            content,
            thumbnail,
            videoUrl,
            tags,
            author: null,
            isPublished: true,
        });
    }

    // Insert all demo blogs at once, bypassing validators for speed
    const createdBlogs = await Blog.insertMany(blogs, { validateBeforeSave: false });
    console.log(`🚀 Successfully created ${createdBlogs.length} demo blogs!`);

    res.status(201).json({
        success: true,
        total: createdBlogs.length,
        page: 1,
        totalPages: 1,
        count: createdBlogs.length,
        data: createdBlogs,
        message: "Demo blogs created successfully",
    });
});
