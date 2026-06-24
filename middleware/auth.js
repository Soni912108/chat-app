const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const logger = require('../utils/logger');

require('dotenv').config();

module.exports = (req, res, next) => {
  try {
    let token = null;
    
    // First check for Authorization header
    if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token in header, check cookies
    if (!token && req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);
      token = cookies.token;
    }

    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    // Verify token using JWT secret
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach decoded user information to request object
    req.user = decodedToken;
    
    // Check for user ID mismatch (optional)
    if (req.body.userId && req.body.userId !== req.user.id) {
      throw new Error('Invalid user ID');
    }
    
    // Proceed to the next middleware or route handler if no errors
    next();
  } catch (error) {
    logger.warn('middleware/auth', `Auth failed: ${error.message}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
