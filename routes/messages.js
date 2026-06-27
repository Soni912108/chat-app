const express = require('express');
const Message = require('../models/Messages');
const router = express.Router();
const auth = require('../middleware/auth');
const Room = require('../models/Rooms');
const { getRoomAccess } = require('../utils/roomAccess');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

router.get('/:roomId', auth,async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(404).json({ message: 'Room not found' });
  }

  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const { isMember, isBanned } = getRoomAccess(room, userId);

    if (isBanned) {
      return res.status(403).json({ message: 'You are banned from this room' });
    }
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const before = typeof req.query.before === 'string' ? req.query.before.trim() : '';
    const query = { room: roomId };

    if (before) {
      if (!/^[a-f\d]{24}$/i.test(before)) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .populate('user', 'username')
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const visibleMessages = hasMore ? messages.slice(0, limit) : messages;
    const orderedMessages = visibleMessages.reverse();

    const messageTuples = orderedMessages.map(message => ({
      _id: message._id.toString(),
      username: message.user.username,
      content: message.content,
      timestamp: message.timestamp,
    }));

    res.json({
      messageTuples,
      hasMore,
      oldestCursor: messageTuples.length ? messageTuples[0]._id : null
    });
  } catch (error) {
    logger.error('routes/messages:list', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

