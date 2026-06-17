const jsonwebtoken = require("jsonwebtoken");

exports.generateToken = (data) => {
    let JWT_KEY, jwt_expire;
    try {
        const config = require('../config/dev.config');
        JWT_KEY = config.JWT_KEY;
        jwt_expire = config.jwt_expire;
    } catch (e) {
        console.error("Failed to load config in generateToken:", e);
    }
    const JWT_SECRET = JWT_KEY || process.env.JWT_KEY || "supersecretkey";
    const expiresIn = jwt_expire || process.env.jwt_expire || '7d';
    return jsonwebtoken.sign(data, JWT_SECRET, { expiresIn });
};