import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { decodeToken } from '../utils/token.js';
import User from '../model/user.model.js';

/**
 * Middleware to check if request is authenticated
 */
export const isAuthenticated = catchAsync(async (req, res, next) => {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new AppError('Authentication required. Please log in.', 401);
    }

    const decoded = decodeToken(token);
    const user = await User.findById(decoded.id);

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
 * Middleware to restrict access to Admin role only
 */
export const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'Admin') {
        return next(new AppError('Forbidden: Admin access required', 403));
    }
    next();
};

/**
 * Middleware to restrict access to specific roles
 */
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(`Access denied. Allowed roles: ${roles.join(', ')}`, 403));
        }
        next();
    };
};
