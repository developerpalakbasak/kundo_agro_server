// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error('🔥 Error:', err); // Log for debugging

    // Default error
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errors = [];

     // JSON parse error (invalid JSON in request body)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON payload';
        errors = [err.message];
    }

    // Mongoose duplicate key error (code 11000)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field} already exists. Please use a different ${field}.`;
    }
    // Mongoose validation error
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        errors = Object.values(err.errors).map(e => e.message);
    }
    // JWT errors (if you use them later)
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Please enter a valid ObjectId';
    }
    // Custom application errors (if you throw them)
    else if (err.isOperational) {
        statusCode = err.statusCode;
        message = err.message;
    }

/* 
    // Clear cookies if unauthorized (Removed as per request to prevent logout on reload/check)
    if (statusCode === 401) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
    }
    */

    // Send response
    res.status(statusCode).json({
        success: false,
        message,
        errors: errors.length ? errors : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

export default errorHandler