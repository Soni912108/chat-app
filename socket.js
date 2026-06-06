// socket.js
const socketIo = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const Room = require('./models/Rooms');
const Message = require('./models/Messages');
const User = require('./models/Users');
const notifyUsers = require('./utils/notificationFunction');
const logger = require('./utils/logger');

function setupSocketHandlers(server) {
  const io = socketIo(server, { path: '/socket.io' });

  io.on('connection', (socket) => {
    let userId = null;
    try {
      const cookies = cookie.parse(socket.request.headers.cookie || '');
      const token = cookies.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded.userId;
        socket.userId = userId;
      } else {
        socket.emit('error', 'Authentication failed');
        socket.disconnect();
        return;
      }
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
      return;
    }

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Join room logic
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', 'Room not found');
          return;
        }
        
        const isMember = room.users.map(u => u.toString()).includes(userId);
        const isBanned = room.banned.map(u => u.toString()).includes(userId);

        if (isBanned) {
          socket.emit('error', 'You are banned from this room');
          return;
        }
        if (room.isPrivate && !isMember) {
          socket.emit('error', 'Access denied');
          return;
        }

        socket.join(roomId);
        logger.info(`User ${userId} joined room ${roomId}`);
      } catch (err) {
        logger.error(`Socket joinRoom error: ${err.message}`);
        socket.emit('error', 'Failed to join room');
      }
    });

    // Message logic
    socket.on('message', async (msg) => {
      const { content, roomId } = msg;
      if (!content || !userId || !roomId) {
        return;
      }
      
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          return;
        }
        const isBanned = room.banned.includes(userId);
        if (isBanned) {
          socket.emit('error', 'You are banned from this room');
          return;
        }
        
        const newMessage = new Message({ content, user: userId, room: roomId });
        await newMessage.save();
        
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown user';
        
        io.to(roomId).emit('message', { content, user: username, roomId });
        
        const messageNotification = `New message in ${room.name} by ${username}: ${content}`;
        const usersToNotify = room.users.filter(user => user.toString() !== userId);
        
        for (const user of usersToNotify) {
          await notifyUsers(userId, user, messageNotification, roomId);
        }
      } catch (error) {
        logger.error(`Socket message error: ${error.message}`);
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
