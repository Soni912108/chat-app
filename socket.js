// socket.js
const socketIo = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const Room = require('./models/Rooms');
const Message = require('./models/Messages');
const User = require('./models/Users');
const notifyUsers = require('./utils/notificationFunction');

function setupSocketHandlers(server) {
  const io = socketIo(server, { path: '/socket.io' });

  io.on('connection', (socket) => {
    console.log('Socket connection attempt from:', socket.request.headers.origin);
    console.log('Socket cookies:', socket.request.headers.cookie);
    
    // Parse JWT from cookie
    let userId = null;
    try {
      const cookies = cookie.parse(socket.request.headers.cookie || '');
      const token = cookies.token;
      
      console.log('Socket - Token found in cookies:', !!token);
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded.userId;
        socket.userId = userId; // Attach to socket for later use
        
        console.log('Socket - User authenticated:', userId);
      } else {
        console.log('Socket - No token found in cookies');
      }
    } catch (err) {
      console.error('Socket - Authentication failed:', err.message);
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
      return;
    }

    if (!userId) {
      console.log('Socket - No user ID, disconnecting');
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
      return;
    }

    // Join room logic
    socket.on('joinRoom', async ({ roomId }) => {
      console.log('Socket - Join room request:', { roomId, userId });
      
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          console.log('Socket - Room not found:', roomId);
          socket.emit('error', 'Room not found');
          return;
        }
        
        console.log('Socket - Room found:', room.name);
        
        const isMember = room.users.map(u => u.toString()).includes(userId);
        const isBanned = room.banned.map(u => u.toString()).includes(userId);
        
        console.log('Socket - User status:', { isMember, isBanned, isPrivate: room.isPrivate });

        if (isBanned) {
          console.log('Socket - User is banned from room');
          socket.emit('error', 'You are banned from this room');
          return;
        }
        if (room.isPrivate && !isMember) {
          console.log('Socket - Access denied to private room');
          socket.emit('error', 'Access denied');
          return;
        }

        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);
      } catch (err) {
        console.error('Socket - Error joining room:', err);
        socket.emit('error', 'Authentication failed');
      }
    });

    // Message logic
    socket.on('message', async (msg) => {
      console.log('Socket - Message received:', msg);
      
      const { content, roomId } = msg;
      if (!content || !userId || !roomId) {
        console.error('Socket - Message validation failed: Missing required fields', { content: !!content, userId: !!userId, roomId: !!roomId });
        return;
      }
      
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          console.log('Socket - Room not found for message:', roomId);
          return;
        }
        
        const isBanned = room.banned.includes(userId);
        if (isBanned) {
          console.log('Socket - User is banned, cannot send message');
          socket.emit('error', 'You are banned from this room');
          return;
        }
        
        console.log('Socket - Saving message to database');
        const newMessage = new Message({ content, user: userId, room: roomId });
        await newMessage.save();
        
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown user';
        
        console.log('Socket - Broadcasting message to room:', roomId);
        io.to(roomId).emit('message', { content, user: username, roomId });
        
        const messageNotification = `New message in ${room.name} by ${username}: ${content}`;
        const usersToNotify = room.users.filter(user => user.toString() !== userId);
        
        console.log('Socket - Sending notifications to users:', usersToNotify.length);
        for (const user of usersToNotify) {
          await notifyUsers(userId, user, messageNotification, roomId);
        }
      } catch (error) {
        console.error('Socket - Error saving message:', error);
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
}

module.exports = { setupSocketHandlers };
