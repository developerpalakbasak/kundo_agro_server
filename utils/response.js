export const setAuthCookies = (
    req,
    res,
    accessToken,
    refreshToken,
    message = 'Success',
    statusCode = 200,
    redirect = null,
    user = null
) => {
    const accessMaxAge = parseInt(process.env.ACCESS_COOKIES_VALIDITY, 10) || (7 * 24 * 60); // 7 days in minutes
    const refreshMaxAge = parseInt(process.env.REFRESH_COOKIES_VALIDITY, 10) || 30; // 30 days

    const baseOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };

    res.cookie('accessToken', accessToken, {
        ...baseOptions,
        maxAge: accessMaxAge * 60 * 1000, // minutes
    });

    res.cookie('refreshToken', refreshToken, {
        ...baseOptions,
        maxAge: refreshMaxAge * 24 * 60 * 60 * 1000,
    });

    const responseData = {
        success: true,
        message,
        token: accessToken,
        accessToken,
    };

    if (user) {
        responseData.user = {
            id: user._id ? user._id.toString() : user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            phone: user.phone || '',
            avatar: user.avatar || null,
        };
    }

    if (redirect) {
        responseData.redirect = redirect;
    }

    return res.status(statusCode).json(responseData);
};

export const setAccessCookies = (res, accessToken, next) => {
    const accessMaxAge = parseInt(process.env.ACCESS_COOKIES_VALIDITY, 10) || (7 * 24 * 60); // 7 days in minutes

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: accessMaxAge * 60 * 1000, // convert minutes to milliseconds
    });
    next();
};

export const clearCookie = (res, message = 'Logged out successfully', statusCode = 200) => {
    const baseOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0),
    };

    res.cookie('accessToken', '', baseOptions);
    res.cookie('refreshToken', '', baseOptions);

    return res.status(statusCode).json({
        success: true,
        message,
    });
};