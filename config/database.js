import mongoose from "mongoose";
import dns from "dns";

const connectDB = async () => {
    try {
        // Set DNS servers to public ones to resolve SRV records on some local networks
        dns.setServers(['8.8.8.8', '1.1.1.1']);

        const uri = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/mydb?authSource=admin';

        // Mask password in URI for logging
        const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
        console.log(`📡 Attempting to connect to MongoDB at: ${maskedUri}`);

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

export default connectDB