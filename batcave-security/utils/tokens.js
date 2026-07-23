const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const ACCESS_TOKEN_MAX_AGE = 15 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
}

function signAccessToken(user, is2FAVerified = false) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            is2FAVerified
        },
        JWT_SECRET,
        { expiresIn: "15s" }
    );
}

function getCookieOptions(maxAge) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge
    };
}

function setTokenCookies(res, accessToken, refreshToken) {
    res.cookie("token", accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    if (refreshToken) {
        res.cookie("refreshToken", refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }
}

function clearTokenCookies(res) {
    res.clearCookie("token", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
}

module.exports = {
    ACCESS_TOKEN_MAX_AGE,
    REFRESH_TOKEN_MAX_AGE,
    generateRefreshToken,
    signAccessToken,
    setTokenCookies,
    clearTokenCookies
};
