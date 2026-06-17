const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const config = require('../config/dev.config');

/**
 * Optional Auth Middleware
 * 
 * Extracts and verifies the JWT token if one is provided in `req.headers.authorization`.
 * If the token is valid, it populates `req.user`.
 * If the token is missing, invalid, or belongs to a blocked user, it safely ignores the error
 * and calls `next()` without returning a 401 Unauthorized error.
 */
module.exports = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ').pop();
            if (token && token !== 'null' && token !== 'undefined') {
                const { _id } = jwt.verify(token, config.JWT_KEY);
                const user = await userModel.findOne({ _id });
                
                if (user && !user.isBlocked && user.token === token) {
                    req.user = user;
                }
            }
        }
        return next();
    } catch (error) {
        // If JWT verfication fails or DB throws, proceed silently
        return next();
    }
};
