import jwt from 'jsonwebtoken';
import User from '../model/user.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { clearCookie, setAuthCookies } from '../utils/response.js';
import { generateAccessToken, generateRefreshToken, decodeToken } from '../utils/token.js';

/**
 * Register a new user (Customer by default, or specific role if Admin)
 */
export const registerUser = catchAsync(async (req, res) => {
    // If user is already authenticated with valid session/cookies, disallow account creation
    if (req.user) {
        throw new AppError('You are already logged in with an active account. Please log out first before creating a new account.', 400);
    }

    const existingToken = req.cookies?.accessToken || req.cookies?.token || req.cookies?.customerAccessToken;
    const existingRefreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (existingToken) {
        try {
            const decoded = decodeToken(existingToken);
            if (decoded?.id) {
                const user = await User.findById(decoded.id);
                if (user && user.status !== 'Inactive') {
                    throw new AppError('You are already logged in with an active account. Please log out first before creating a new account.', 400);
                }
            }
        } catch (err) {
            if (err instanceof AppError) throw err;
        }
    }

    if (existingRefreshToken) {
        try {
            const decodedRefresh = jwt.verify(existingRefreshToken, process.env.JWT_SECRET);
            const userId = decodedRefresh.userId || decodedRefresh.id;
            if (userId) {
                const user = await User.findById(userId);
                if (user && user.status !== 'Inactive') {
                    throw new AppError('You are already logged in with an active account. Please log out first before creating a new account.', 400);
                }
            }
        } catch (err) {
            if (err instanceof AppError) throw err;
        }
    }

    const { name, email, password, role, status, phone, avatar } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('Full name is required', 400);
    }
    if (!email || !email.trim()) {
        throw new AppError('Email address is required', 400);
    }
    if (!password || password.length < 6) {
        throw new AppError('Password is required and must be at least 6 characters', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
        throw new AppError('Email is already registered. Please use a different email or log in.', 400);
    }

    // Role assignment: Only authenticated Admin can assign non-Customer roles
    console.log("ROle:", role)
    let assignedRole = 'Customer';
    if (role) {
        const validRoles = ['Admin', 'Seller', 'Customer'];
        if (!validRoles.includes(role)) {
            throw new AppError(`Invalid role. Allowed roles: ${validRoles.join(', ')}`, 400);
        }
        if (req.user && req.user.role === 'Admin') {
            assignedRole = role;
        }
    }



    const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: assignedRole,
        status: status && req.user?.role === 'Admin' ? status : 'Active',
        phone: phone ? phone.trim() : '',
        avatar: avatar || null,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    setAuthCookies(req, res, accessToken, refreshToken, 'Registration successful', 201, null, user);
});

/**
 * Login user via email or phone and password
 */
export const login = catchAsync(async (req, res) => {
    const { email, password, identifier, userId, phone, sellerFor } = req.body;
    const loginIdentifier = (email || identifier || userId || phone || '').toString().trim();

    if (!loginIdentifier || !password) {
        throw new AppError('Please provide email/phone and password', 400);
    }

    // Support logging in via email or phone
    const user = await User.findOne({
        $or: [
            { email: loginIdentifier.toLowerCase() },
            { phone: loginIdentifier }
        ]
    }).select('+password');

    if (!user) {
        throw new AppError('Invalid email/phone or password', 401);
    }

    if (user.status === 'Inactive') {
        throw new AppError('Your account is currently inactive. Please contact support.', 403);
    }

    const isMatch = await user.comparePassword(password.toString());
    if (!isMatch) {
        throw new AppError('Invalid email/phone or password', 401);
    }

    if (sellerFor && user.role === 'Seller') {
        if (user.sellerFor && user.sellerFor !== sellerFor) {
            const currentPortal = user.sellerFor === 'animale' ? 'Cattle' : 'Fish Seed';
            const attemptedPortal = sellerFor === 'animale' ? 'Cattle' : 'Fish Seed';
            throw new AppError(`You are registered as a ${currentPortal} seller. You cannot login to the ${attemptedPortal} portal.`, 403);
        }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    const redirect = req.query.redirect;
    setAuthCookies(req, res, accessToken, refreshToken, 'Login successful', 200, redirect, user);
});

/**
 * Logout current user and clear cookies
 */
export const logout = catchAsync(async (req, res) => {
    clearCookie(res, 'Logged out successfully', 200);
});

/**
 * Get current authenticated user profile
 */
export const aboutMe = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        user,
    });
});

/**
 * Verify session token and return user profile
 */
export const verifyUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return clearCookie(res, 'User session expired or user removed', 401);
    }

    res.status(200).json({
        success: true,
        message: 'Session verified',
        user,
    });
});

/**
 * Refresh access token using refresh token cookie or header
 */
export const refreshSession = catchAsync(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];

    if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
        return clearCookie(res, 'Invalid or expired refresh token. Please log in again.', 401);
    }

    const user = await User.findById(decoded.userId || decoded.id);
    if (!user || user.status === 'Inactive') {
        return clearCookie(res, 'User is inactive or no longer exists.', 401);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user._id);

    setAuthCookies(req, res, newAccessToken, newRefreshToken, 'Session refreshed successfully', 200, null, user);
});

/**
 * Update authenticated user's own profile (Customer / Seller / Admin)
 */
export const updateMyProfile = catchAsync(async (req, res) => {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user,
    });
});

/**
 * Change logged-in user's own password
 */
export const changeAdminPassword = catchAsync(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new AppError('Both old password and new password are required', 400);
    }
    if (newPassword.length < 6) {
        throw new AppError('New password must be at least 6 characters long', 400);
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
        throw new AppError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
    });
});

