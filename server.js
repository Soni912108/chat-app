const express = require('express');
const path = require('path');

const Message = require('./models/Messages');
const Room = require('./models/Rooms');

const connectToMongoDB = require('./databases/mongodbConnection');
const connectToRedis = require('./databases/redisConnection');
const User = require('./models/Users'); 

const avatarRoutes = require('./routes/avatar');
const authRoutes = require('./routes/userAuth');
const roomRoutes = require('./routes/room');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');

//utils
const notifyUsers = require('./utils/notificationFunction');

const { io, server, app } = require('./socket');

require('dotenv').config();
const cors = require('cors'); // Import CORS middleware


const PORT = process.env.PORT;


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
  res.sendFile(path.join(__dirname, 'public', 'templates', 'dashboard.html'));
});

// Route to render the rooms templates
app.get('/room',  (req, res) => {
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
app.get('/updateUser',  (req, res) => {
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
  if (err.status === 401) {
    res.redirect('/login.html?message=loggedOut');
  } else {
    res.status(err.status || 500).send(err.message || 'Internal Server Error');
  }
});

app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

// Connect to Redis
const redisClient = connectToRedis();

redisClient.connect()
  .then(() => console.log('Connected to Redis, server.js file'))
  .catch((err) => console.error('Redis connection error:', err));

// Handle process exit and cleanup
process.on('exit', () => {
  redisClient.quit();
});

process.on('SIGINT', () => {
  redisClient.quit(() => {
    console.log('Redis client closed due to app termination');
    process.exit(0);
  });
});

// Connect to MongoDB
connectToMongoDB();

// Server listen logic
server.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
  messagesRoutes(app, redisClient);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/fileUpload', avatarRoutes); // Use avatar routes
app.use('/api/user', settingsRoutes); // Use settings routes
app.use('/api/notifications', notificationRoutes);




io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('joinRoom', async (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);

    const room = await Room.findById(roomId).populate('users', 'username');
    if (room.users.length > 0) {
      const userList = room.users.map(user => ({ id: user._id, username: user.username }));
      io.to(roomId).emit('updateUserList', userList);
    }
    
  });

  socket.on('message', async (msg) => {
    const { content, userId, roomId } = msg;

    if (!content || !userId || !roomId) {
      return console.error('Message validation failed: Missing required fields');
    }

    // Check if the user is banned from the room
    const room = await Room.findById(roomId);
    const isBanned = room.banned.includes(userId);
    if (isBanned) {
      socket.emit('error', 'You are banned from this room');
      return;
    }

    try {
      // Save the message to MongoDB
      const newMessage = new Message({ content, user: userId, room: roomId });
      await newMessage.save();

      // Add the message to the room's message list in Redis
      redisClient.lPush(`room:${roomId}:messages`, JSON.stringify(newMessage));

      // Fetch the user's username
      const user = await User.findById(userId);
      const username = user ? user.username : 'Unknown user';

      // Emit the message to the specific room
      io.to(roomId).emit('message', { content, user: username, roomId });

      // Notify all users in the room (except the sender)
      const messageNotification = `New message in ${room.name} by ${username}: ${content}`;
      const usersToNotify = room.users.filter(user => user.toString() !== userId);
      for (const user of usersToNotify) {
        await notifyUsers(userId,user,messageNotification,roomId);
      }
        

    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('banUser', (roomId, username) => {
    io.to(roomId).emit('userBanned', username);
  });
  
  socket.on('typing', (roomId) => {
    socket.to(roomId).emit('typing');
  });

  socket.on('disconnect', async () => {
    console.log('user disconnected');
  });
});
