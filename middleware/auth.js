const jwt = require('jsonwebtoken');
const cookie = require('cookie');
require('dotenv').config();

module.exports = (req, res, next) => {
  try {
    console.log('Auth middleware - Request path:', req.path);
    console.log('Auth middleware - Request headers:', req.headers);
    
    let token = null;
    
    // First check for Authorization header
    if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth middleware - Token from Authorization header');
    }
    
    // If no token in header, check cookies
    if (!token && req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);
      token = cookies.token;
      console.log('Auth middleware - Token from cookies');
    }

    if (!token) {
      console.log('Auth middleware - No token found');
      throw new Error('Unauthorized: No token provided');
    }

    console.log('Auth middleware - Token found, verifying...');

    // Verify token using JWT secret
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token verified, user ID:', decodedToken.id);
    
    // Attach decoded user information to request object
    req.user = decodedToken;
    
    // Check for user ID mismatch (optional)
    if (req.body.userId && req.body.userId !== req.user.id) {
      console.log('Auth middleware - User ID mismatch:', req.body.userId, 'vs', req.user.id);
      throw new Error('Invalid user ID');
    }
    
    console.log('Auth middleware - Authentication successful');
    // Proceed to the next middleware or route handler if no errors
    next();
  } catch (error) {
    console.error('Auth middleware - Authentication failed:', error.message);
    // Handle errors 
    res.status(401).json({ error: 'Unauthorized' });
  }
};
