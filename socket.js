// socket.js
const socketIo = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const Room = require('./models/Rooms');
const Message = require('./models/Messages');
const User = require('./models/Users');
const notifyUsers = require('./utils/notificationFunction');
const logger = require('./utils/logger');
const { setIo } = require('./utils/socketState');
const { getRoomAccess } = require('./utils/roomAccess');

function setupSocketHandlers(server) {
  const io = socketIo(server, { path: '/socket.io' });
  setIo(io);

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
      logger.warn('socket/connection', `Socket auth failed: ${err.message}`);
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
      return;
    }

    if (!userId) {
      socket.disconnect();
      return;
    }

    // A Socket.io room named by userId lets routes/utilities target one user
    // for notifications regardless of which page that user currently has open.
    socket.join(userId.toString());

    // Join room logic
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', 'Room not found');
          return;
        }

        const { isMember, isBanned } = getRoomAccess(room, userId);

        if (isBanned) {
          socket.emit('error', 'You are banned from this room');
          return;
        }
        if (!isMember) {
          socket.emit('error', 'Access denied');
          return;
        }

        socket.join(roomId);
        logger.debug('socket/joinRoom', `User ${userId} joined room ${roomId}`);
      } catch (err) {
        logger.error('socket/joinRoom', err.message);
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
        const { isMember, isBanned } = getRoomAccess(room, userId);

        if (isBanned) {
          socket.emit('error', 'You are banned from this room');
          return;
        }
        if (!isMember) {
          socket.emit('error', 'You are not a member of this room');
          return;
        }
        
        const newMessage = new Message({ content, user: userId, room: roomId });
        await newMessage.save();
        
        const user = await User.findById(userId);
        const username = user ? user.username : 'Unknown user';
        
        io.to(roomId).emit('message', { content, user: username, roomId, timestamp: newMessage.timestamp });
        
        const messageNotification = `New message in ${room.name} by ${username}: ${content}`;
        const usersToNotify = room.users.filter(user => user.toString() !== userId);
        
        for (const user of usersToNotify) {
          await notifyUsers(userId, user, messageNotification, roomId);
        }
      } catch (error) {
        logger.error('socket/message', error.message);
      }
    });

    socket.on('typing', (roomId) => {
      if (!socket.rooms.has(roomId)) {
        return;
      }
      socket.to(roomId).emit('typing');
    });

    socket.on('disconnect', async () => {
      logger.debug('socket/disconnect', `User ${userId} disconnected`);
    });
  });
}

module.exports = { setupSocketHandlers };
