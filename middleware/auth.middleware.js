import jwt from 'jsonwebtoken';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { decodeToken, generateAccessToken } from '../utils/token.js';
import User from '../model/user.model.js';

/**
 * Middleware to check if request is authenticated (JWT from Cookie or Authorization header).
 * If accessToken is expired but a valid refreshToken exists, automatically refreshes the session.
 */
export const isAuthenticated = catchAsync(async (req, res, next) => {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (!token && !refreshToken) {
        throw new AppError('Authentication required. Please log in.', 401);
    }

    let user = null;

    if (token) {
        try {
            const decoded = decodeToken(token);
            user = await User.findById(decoded.id);
        } catch (err) {
            // If access token is expired and refreshToken exists, auto-refresh transparently
            if (err.message === 'Token expired' && refreshToken) {
                try {
                    const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
                    user = await User.findById(decodedRefresh.userId || decodedRefresh.id);
                    if (user && user.status !== 'Inactive') {
                        const newAccessToken = generateAccessToken(user);
                        const accessMaxAge = (parseInt(process.env.ACCESS_COOKIES_VALIDITY, 10) || (7 * 24 * 60)) * 60 * 1000;
                        res.cookie('accessToken', newAccessToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                            maxAge: accessMaxAge,
                        });
                        res.setHeader('x-access-token', newAccessToken);
                    }
                } catch {
                    throw new AppError('Session expired. Please log in again.', 401);
                }
            } else {
                throw err;
            }
        }
    } else if (refreshToken) {
        // Only refresh token was provided in cookies
        try {
            const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
            user = await User.findById(decodedRefresh.userId || decodedRefresh.id);
            if (user && user.status !== 'Inactive') {
                const newAccessToken = generateAccessToken(user);
                const accessMaxAge = (parseInt(process.env.ACCESS_COOKIES_VALIDITY, 10) || (7 * 24 * 60)) * 60 * 1000;
                res.cookie('accessToken', newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: accessMaxAge,
                });
                res.setHeader('x-access-token', newAccessToken);
            }
        } catch {
            throw new AppError('Session expired. Please log in again.', 401);
        }
    }

    if (!user) {
        throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    if (user.status === 'Inactive') {
        throw new AppError('Your account is currently inactive. Please contact an administrator.', 403);
    }

    req.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
    };

    next();
});

/**
 * Optional authentication: Attaches req.user if a valid token exists, but does not error if guest
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (token) {
        try {
            const decoded = decodeToken(token);
            const user = await User.findById(decoded.id);
            if (user && user.status !== 'Inactive') {
                req.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status
                };
            }
        } catch (err) {
            if (err.message === 'Token expired' && refreshToken) {
                try {
                    const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
                    const user = await User.findById(decodedRefresh.userId || decodedRefresh.id);
                    if (user && user.status !== 'Inactive') {
                        const newAccessToken = generateAccessToken(user);
                        const accessMaxAge = (parseInt(process.env.ACCESS_COOKIES_VALIDITY, 10) || (7 * 24 * 60)) * 60 * 1000;
                        res.cookie('accessToken', newAccessToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                            maxAge: accessMaxAge,
                        });
                        req.user = {
                            id: user._id.toString(),
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            status: user.status
                        };
                    }
                } catch {
                    // Ignore on optional auth
                }
            }
        }
    } else if (refreshToken) {
        try {
            const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
            const user = await User.findById(decodedRefresh.userId || decodedRefresh.id);
            if (user && user.status !== 'Inactive') {
                req.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status
                };
            }
        } catch {
            // Ignore
        }
    }

    next();
});

/**
 * Middleware to restrict access to specific roles
 * Values: "Admin", "Manager", "Staff", "Customer"
 */
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(`Access denied. Allowed roles: ${roles.join(', ')}`, 403));
        }
        next();
    };
};

/**
 * Convenience role helpers
 */
export const isAdmin = authorizeRoles('Admin');
export const isManagerOrAbove = authorizeRoles('Admin', 'Manager');
export const isStaffOrAbove = authorizeRoles('Admin', 'Manager', 'Staff');
export const isCustomer = authorizeRoles('Customer');
