const express = require('express');
const Message = require('../models/Messages');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');


// Function to fetch messages (without Redis)
router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;

  try {
    // Fetch messages directly from MongoDB
    const messages = await Message.find({ room: roomId })
      .populate('user', 'username') // Populate only 'username' field
      .sort({ timestamp: -1 }); // Sort by creation date in ascending order

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
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

