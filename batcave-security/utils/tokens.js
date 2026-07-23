const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { getUserScopes } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const SETUP_TOKEN_MAX_AGE = 10 * 60 * 1000; // 10 minutes pour l'enrôlement 2FA

function generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
}

function signAccessToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            scopes: getUserScopes(user)
        },
        JWT_SECRET,
        { expiresIn: "15m" }
    );
}

function signSetupToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            purpose: "2fa-setup"
        },
        JWT_SECRET,
        { expiresIn: "10m" }
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

function setSetupTokenCookie(res, setupToken) {
    res.cookie("setupToken", setupToken, getCookieOptions(SETUP_TOKEN_MAX_AGE));
}

function clearTokenCookies(res) {
    res.clearCookie("token", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.clearCookie("setupToken", { path: "/" });
}

module.exports = {
    ACCESS_TOKEN_MAX_AGE,
    REFRESH_TOKEN_MAX_AGE,
    SETUP_TOKEN_MAX_AGE,
    generateRefreshToken,
    signAccessToken,
    signSetupToken,
    setTokenCookies,
    setSetupTokenCookie,
    clearTokenCookies
};
