import User from '../model/user.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { clearCookie, setAuthCookies } from '../utils/response.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';

/**
 * Register a new user
 * Fields: name, email, password, role, status, phone, avatar
 */
export const registerUser = catchAsync(async (req, res) => {
    const { name, email, password, role, status, phone, avatar } = req.body;

    if (!name || !email) {
        throw new AppError('Name and email are required', 400);
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
        throw new AppError('Email is already registered. Please use a different email.', 400);
    }

    // Create user
    const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: role || 'Customer',
        status: status || 'Active',
        phone: phone ? phone.trim() : '',
        avatar: avatar || null
    });

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user
    });
});

/**
 * Login user via email / phone and password
 */
export const login = catchAsync(async (req, res) => {
    const { email, password, identifier, userId } = req.body;
    const loginIdentifier = (email || identifier || userId || '').toString().trim();

    if (!loginIdentifier || !password) {
        throw new AppError('Please provide email/identifier and password', 400);
    }

    console.log(`🔐 Login attempt for: ${loginIdentifier}`);

    // Support logging in via email or phone
    const user = await User.findOne({
        $or: [
            { email: loginIdentifier.toLowerCase() },
            { phone: loginIdentifier }
        ]
    }).select('+password');

    if (!user) {
        console.log(`❌ User not found for: ${loginIdentifier}`);
        throw new AppError('Invalid credentials', 401);
    }

    if (user.status === 'Inactive') {
        console.log(`⚠️ Inactive account attempt: ${user._id}`);
        throw new AppError('Your account is inactive. Please contact support.', 403);
    }

    const isMatch = await user.comparePassword(password.toString());
    if (!isMatch) {
        console.log(`❌ Password mismatch for user: ${user._id}`);
        throw new AppError('Invalid credentials', 401);
    }

    console.log(`✅ Authentication successful for user: ${user._id}`);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    const redirect = req.query.redirect;
    setAuthCookies(req, res, accessToken, refreshToken, 'User logged in successfully', 200, redirect);
});

/**
 * Logout current user and clear auth cookies
 */
export const logout = catchAsync(async (req, res) => {
    clearCookie(res, 'User logged out successfully', 200);
});

/**
 * Get current authenticated user details
 */
export const aboutMe = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        user
    });
});

/**
 * Verify token session and return active user profile
 */
export const verifyUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return clearCookie(res, 'User no longer exists in database', 401);
    }

    res.status(200).json({
        success: true,
        message: 'User verified successfully',
        user
    });
});

/**
 * Change logged-in user's own password
 */
export const changeAdminPassword = catchAsync(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new AppError('Both oldPassword and newPassword are required', 400);
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
        throw new AppError('Old password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password changed successfully'
    });
});

/**
 * Admin change password of another user
 */
export const changeUserPasswordByAdmin = catchAsync(async (req, res) => {
    const { userId, newPassword } = req.body;
    const targetId = userId || req.params.id;

    if (!targetId || !newPassword) {
        throw new AppError('User ID and new password are required', 400);
    }

    const user = await User.findById(targetId).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'User password updated successfully'
    });
});

/**
 * Get all users with optional filtering (Admin only)
 */
export const getAllUsers = catchAsync(async (req, res) => {
    const { role, status, search, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        count: users.length,
        users
    });
});

/**
 * Get single user by MongoDB ID
 */
export const getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        user
    });
});

/**
 * Update user details (Admin only)
 */
export const updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, status, phone, avatar, password } = req.body;

    const user = await User.findById(id).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (email && email.toLowerCase().trim() !== user.email) {
        const existingEmail = await User.findOne({
            email: email.toLowerCase().trim(),
            _id: { $ne: id }
        });
        if (existingEmail) {
            throw new AppError('Email is already taken by another user', 400);
        }
        user.email = email.toLowerCase().trim();
    }

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (password) user.password = password;

    await user.save();

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user
    });
});

/**
 * Delete a user by ID (Admin only)
 */
export const deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        deletedId: id
    });
});