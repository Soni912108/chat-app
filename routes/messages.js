const express = require('express');
const Message = require('../models/Messages');
const router = express.Router();
const auth = require('../middleware/auth');
const Room = require('../models/Rooms');
const { getRoomAccess } = require('../utils/roomAccess');
const logger = require('../utils/logger');

router.get('/:roomId', auth,async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  const room = await Room.findById(roomId);

  if (!room) return res.status(404).json({ message: 'Room not found' });

  const { isMember, isBanned } = getRoomAccess(room, userId);

  if (!isMember) {
    return res.status(403).json({ message: 'Access denied' });
  }
  if (isBanned) {
    return res.status(403).json({ message: 'You are banned from this room' });
  }

  try {
    // Fetch messages directly from MongoDB
    const messages = await Message.find({ room: roomId })
      .populate('user', 'username') // Populate only 'username' field
      .sort({ timestamp: 1 }); // Sort by creation date in ascending order

    if (!messages.length) {
      return res.status(404).json({ message: 'No messages found for this room' });
    }

    const messageTuples = messages.map(message => ({
      username: message.user.username,
      content: message.content,
      timestamp: message.timestamp, // Include the timestamp
    }));

    res.json({ messageTuples });
  } catch (error) {
    logger.error('routes/messages:list', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

