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
const Room = require('./models/Rooms');
const { getRoomAccess } = require('./utils/roomAccess');

const isVercel = Boolean(process.env.VERCEL);
const PORT = process.env.PORT || 3001;
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(__dirname, 'uploads');

// Create app
const app = express();
let server = null;
if (!isVercel) {
  server = http.createServer(app);
}

// Middleware
app.use(cors({
  methods: ['GET', 'POST','PUT','DELETE','PATCH'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));

app.use(express.json());
app.use(express.static(publicDir)); // Serve /css, /js, /images directly
app.use('/public', express.static(publicDir)); // Backward-compatible /public/* assets
app.use('/uploads', express.static(uploadsDir)); // Serve uploads directory



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
app.get('/room', async (req, res) => {
  try {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId.trim() : '';
    if (!roomId) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'templates', '404.html'));
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    if (!token) {
      return res.redirect('/login?message=loggedOut');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.redirect('/login?message=loggedOut');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'templates', '404.html'));
    }

    const { isMember, isOwner, isBanned } = getRoomAccess(room, decoded.id);
    if (isBanned || (!isMember && !isOwner)) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'templates', '404.html'));
    }

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

app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

// Connect to MongoDB
connectToMongoDB().catch(error => {
  logger.error('db/mongo', error.message);
});

// Server listen logic
if (!isVercel) {
  server.listen(PORT, () => {
    logger.info('server/listen', `Server is running on port ${PORT}`);
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

// Setup Socket.io handlers only for the local Node server
if (server) {
  setupSocketHandlers(server);
}

module.exports = app;
