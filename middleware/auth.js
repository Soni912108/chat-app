const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Check for Authorization header
    if (!req.headers.authorization) {
      throw new Error('Unauthorized: Missing Authorization header');
    }
    //  Extract token from Authorization header
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error('Unauthorized: Invalid token format');
    }
    // Verify token using JWT secret
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    // Attach decoded user information to request object
    req.user = decodedToken;
    //Check for user ID mismatch (optional)
    if (req.body.userId && req.body.userId !== req.user.userId) {
      throw new Error('Invalid user ID');
    }
    // Proceed to the next middleware or route handler if no errors
    next();
  } catch (error) {
    // Handle errors 
    res.status(401).json({ error: new Error('Unauthorized') });
  }
};
