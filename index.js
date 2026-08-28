import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './config/database.js';
import fs from 'fs';
import path from 'path';
import errorHandler from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';

// Routes
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import productRoutes from './routes/product.route.js';
import blogRoutes from './routes/blog.route.js';
import orderRoutes from './routes/order.route.js';
import adminRoutes from './routes/admin/index.js';
import adminUserRoutes from './routes/admin/user.route.js';

// Load environment variables
console.log(`📂 Current Working Directory: ${process.cwd()}`);
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log('📝 Found .env file, loading...');
    dotenv.config({ path: envPath });
} else {
    console.log('⚠️  .env file NOT found at:', envPath);
    dotenv.config(); // Fallback to default behavior
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx, Cloudflare)
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        // Allow requests with no origin (like Next.js server-side fetches) or explicitly allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Static uploads serving for uploaded thumbnails and videos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check API
app.get('/api/v1', (req, res) => res.status(200).json({
    success: true,
    message: 'Kundu Agro & Fisheries API is LIVE',
    timestamp: new Date().toISOString(),
}));

// Mount Routes
// 1. Auth & Session Routes
app.use('/api/v1/auth', authRoutes);

// 2. Customer / Authenticated User Routes
app.use('/api/v1/user', userRoutes);

// 3. Public & Customer Common Routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/orders', orderRoutes);

// 4. Dedicated Admin / Manager / Staff Routes
app.use('/api/v1/admin', adminRoutes);

// 5. Backward Compatibility Aliases
app.use('/api/v1/users', adminUserRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Create DB connection and start server
const startServer = async () => {
    try {
        await connectDB();

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'uploads');
        console.log(`🔍 Checking uploads directory at: ${uploadDir}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('📁 Created uploads directory');
        } else {
            console.log('✅ Uploads directory already exists');
        }

        // Start the server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};

startServer();