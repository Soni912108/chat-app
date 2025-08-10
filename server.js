const express = require('express');
const path = require('path');
const http = require('http');

const connectToMongoDB = require('./databases/mongodbConnection');
const avatarRoutes = require('./routes/avatar');
const authRoutes = require('./routes/userAuth');
const roomRoutes = require('./routes/room');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const { setupSocketHandlers } = require('./socket');

require('dotenv').config();
const cors = require('cors'); // Import CORS middleware


const PORT = process.env.PORT; //is need to start the server

// Create app and server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  methods: ['GET', 'POST','PUT','DELETE','PATCH'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));

app.use(express.json());
app.use('/public', express.static('public')); // Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploads directory



// Middleware to protect dashboard and room routes
app.get('/dashboard', (req, res) => {
  try {
        res.sendFile(path.join(__dirname, 'public', 'templates', 'dashboard.html'));
    } catch (error) {
        console.error('Error serving dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});
// Route to render the rooms templates
// Note: Access control is handled client-side in chatrooms.js
app.get('/room',(req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'room.html'));
});

// Route to render profile page
app.get('/profile',(req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'profile.html'));
});

// Route to render notification page
app.get('/notification',(req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates', 'notification.html'));
});


// Route to render updateUserProfile page
app.get('/updateUser', (req, res) => {
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

// Connect to Redis
// const redisClient = connectToRedis();

// redisClient.connect()
//   .then(() => console.log('Connected to Redis, server.js file'))
//   .catch((err) => console.error('Redis connection error:', err));

// // Handle process exit and cleanup
// process.on('exit', () => {
//   redisClient.quit();
// });

// process.on('SIGINT', () => {
//   redisClient.quit(() => {
//     console.log('Redis client closed due to app termination');
//     process.exit(0);
//   });
// });

// Connect to MongoDB
connectToMongoDB();

// Server listen logic
server.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
  // messagesRoutes(app, redisClient);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/fileUpload', avatarRoutes); // Use avatar routes
app.use('/api/user', settingsRoutes); // Use settings routes
app.use('/api/notifications', notificationRoutes);

// Setup Socket.io handlers
setupSocketHandlers(server);