const express = require('express');
const path = require('path');
const http = require('http');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const connectToMongoDB = require('./databases/mongodbConnection');
const avatarRoutes = require('./routes/avatar');
const authRoutes = require('./routes/userAuth');
const roomRoutes = require('./routes/room');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const { setupSocketHandlers } = require('./socket');
const logger = require('./utils/logger');
const cors = require('cors'); // Import CORS middleware
const requireRoomPageAccess = require('./utils/requireRoomPageAccess');

const PORT = process.env.PORT || 3001;
const isTest = process.env.NODE_ENV === 'test';
const publicDir = path.join(__dirname, 'public');
const faviconPath = path.join(publicDir, 'images', 'favicon.svg');

// Create app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  methods: ['GET', 'POST','PUT','DELETE','PATCH'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));

app.use(express.json());
app.use(express.static(publicDir)); // Serve /css, /js, /images directly
app.use('/public', express.static(publicDir)); // Backward-compatible /public/* assets

app.get(['/favicon.ico', '/favicon.svg'], (req, res) => {
  res.type('image/svg+xml').sendFile(faviconPath);
});



// Middleware to protect dashboard and room routes
async function requirePageAccess(req, res, next) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    if (!token) {
      return res.redirect('/login?message=loggedOut');
    }

    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.redirect('/login?message=loggedOut');
  }
}

app.get('/dashboard', requirePageAccess, (req, res) => {
  try {
        res.sendFile(path.join(__dirname, 'public', 'templates', 'dashboard.html'));
    } catch (error) {
        logger.error('server/dashboard', error.message);
        res.status(500).send('Error loading dashboard');
    }
});
// Route to render the rooms templates
app.get('/room', requireRoomPageAccess, (req, res) => {
  try {
    return res.sendFile(path.join(__dirname, 'public', 'templates', 'room.html'));
  } catch (error) {
    logger.error('server/room', error.message);
    return res.status(500).send('Error loading room');
  }
});

// Route to render profile page
app.get('/profile', requirePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'profile.html'));
});

// Route to render notification page
app.get('/notification', requirePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'notification.html'));
});


// Route to render updateUserProfile page
app.get('/updateUser', requirePageAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'updateUser.html'));
});

// Landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'landing.html'));
});

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public','templates', 'login.html'));
});


// Registration page route
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'register.html'));
});

// Error handling for unauthorized access
app.use((err, req, res, next) => {
  // Only redirect to login for page routes, not API routes
  if (err.status === 401 && !req.path.startsWith('/api/')) {
    res.redirect('/login?message=loggedOut');
  } else if (err.status === 401 && req.path.startsWith('/api/')) {
    // For API routes, return JSON error instead of redirecting
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    res.status(err.status || 500).send(err.message || 'Internal Server Error');
  }
});

// Connect to MongoDB
if (!isTest) {
  connectToMongoDB().catch(error => {
    logger.error('db/mongo', error.message);
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/uploads', avatarRoutes); // Use upload routes
app.use('/api/fileUpload', avatarRoutes); // Legacy alias for avatar routes
app.use('/api/users', settingsRoutes); // Use settings routes
app.use('/api/user', settingsRoutes); // Legacy alias for settings routes
app.use('/api/notifications', notificationRoutes);

if (!isTest) {
  setupSocketHandlers(server);
}

// Server listen logic
if (require.main === module && !isTest) {
  server.listen(PORT, () => {
    logger.info('server/listen', `Server is running on port ${PORT}`);
  });
}

module.exports = app;
