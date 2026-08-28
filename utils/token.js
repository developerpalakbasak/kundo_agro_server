import jwt from 'jsonwebtoken';
import AppError from './appError.js';

export const generateAccessToken = (user) => {
    const payload = {
        id: user._id || user.id,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        role: user.role
    };
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_VALIDITY || '7d'
    });
};


export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_VALIDITY || '7d'
    });
};

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws an AppError (401) if the token is invalid or expired.
 */
export const decodeToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        // Differentiate between specific JWT errors if needed
        if (error.name === 'TokenExpiredError') {
            throw new AppError('Token expired', 401);
        }
        if (error.name === 'JsonWebTokenError') {
            throw new AppError('Invalid token', 401);
        }
        // Fallback for any other error
        throw new AppError('Authentication failed', 401);
    }
};