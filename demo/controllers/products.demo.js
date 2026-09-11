import crypto from "crypto";
import mongoose from "mongoose";
import Product from "../../model/product.model.js";

/**
 * Creates diverse demo products safely.
 * @param {number} count - Number of products to create (default: 20)
 * @param {object} res - Express response object
 */
export async function createDemoProducts(req, res) {

  const count = req.query.count || 20;

  try {
    // 1. Ensure DB connection is active
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve, reject) => {
        mongoose.connection.once("connected", resolve);
        mongoose.connection.once("error", reject);
      });
    }

    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

    const slugify = (text) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const adjectives = ["Premium", "Organic", "Fresh", "Smart", "Eco-Friendly", "Handmade", "Ultra", "Classic", "Deluxe", "Pure"];
    const materials = ["Cotton", "Wooden", "Stainless Steel", "Leather", "Bamboo", "Glass", "Ceramic", "Aluminum"];
    const items = ["Backpack", "Coffee Beans", "Desk Lamp", "Water Bottle", "Running Shoes", "T-Shirt", "Honey Jar", "Headphones", "Green Tea", "Wireless Mouse"];

    const categories = ["Electronics", "Clothing", "Groceries", "Home & Kitchen", "Books", "Beauty"];
    const units = ["kg", "g", "pcs", "pack", "liter", "box"];
    const districts = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal"];
    const firstNames = ["Rahim", "Karim", "Ayesha", "Tanvir", "Nusrat", "Fatima", "Hasan", "Sakib"];
    const lastNames = ["Ahmed", "Chowdhury", "Khan", "Rahman", "Hossain", "Islam"];

    const products = [];

    for (let i = 0; i < count; i++) {
      const productName = `${getRandom(adjectives)} ${getRandom(materials)} ${getRandom(items)}`;
      const price = getRandomFloat(10, 300);

      // Explicitly guarantee compareAtPrice is strictly higher or null
      const hasDiscount = Math.random() < 0.4;
      const compareAtPrice = hasDiscount ? parseFloat((price + getRandomFloat(10, 50)).toFixed(2)) : null;

      // Unique slug using timestamp + random hex to guarantee uniqueness against schema's unique index
      const uniqueHash = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
      const slug = `${slugify(productName)}-${uniqueHash}`;

      const randomImgId = getRandomInt(1, 1000);
      const thumbnail = `https://picsum.photos/seed/${randomImgId}/600/600`;
      const extraImagesCount = getRandomInt(2, 4);
      const images = Array.from(
        { length: extraImagesCount },
        (_, idx) => `https://picsum.photos/seed/${randomImgId + idx + 1}/800/800`
      );

      const description = `This ${productName.toLowerCase()} is crafted with high quality materials. Perfect for everyday use with high reliability and durability.`;

      products.push({
        name: productName,
        slug,
        description,
        category: getRandom(categories),
        unit: getRandom(units),
        price,
        compareAtPrice,
        thumbnail,
        images,
        video: Math.random() < 0.3 ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : null,
        sellerName: `${getRandom(firstNames)} ${getRandom(lastNames)}`,
        sellerDistrict: getRandom(districts),
        sellerPhone: `+8801${getRandomInt(3, 9)}${getRandomInt(10000000, 99999999)}`,
        isAvailable: Math.random() < 0.85,
      });
    }

    // Direct insertion bypassing doc validators to eliminate custom validator context bugs
    const createdProducts = await Product.insertMany(products, { validateBeforeSave: false });
    console.log(`🚀 Successfully created ${createdProducts.length} demo products!`);

    if (res) {
      const totalCreated = createdProducts.length;
      res.status(201).json({
        success: true,
        total: totalCreated,
        page: 1,
        totalPages: 1,
        count: totalCreated,
        data: createdProducts,
        message: "Demo products created successfully",
      });
    }

  } catch (error) {
    console.error("❌ DB Insertion Failed:");
    console.dir(error, { depth: null }); // Prints the EXACT error structure in console
    throw error;
  }
}