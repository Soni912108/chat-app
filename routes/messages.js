//routes/messages.js

const express = require('express');
const Message = require('../models/Messages');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Notification = require('../models/Notification');

module.exports = (app, redisClient) => {
  // Function to fetch messages from Redis (if available)
  async function getMessagesFromRedis(roomId) {
    const key = `room:${roomId}:messages`;
    try {
      const messageList = await redisClient.lRange(key, 0, -1); // Get all messages from list
      if (!messageList.length) {
        return null;
      }

      const messagesWithUsername = [];
      for (const messageJSON of messageList) {
        const message = JSON.parse(messageJSON);
        const user = await User.findById(message.user); // Fetch user
        messagesWithUsername.push({
          username: user ? user.username : null, // Handle potential missing user
          content: message.content,
        });
      }

      return messagesWithUsername;
    } catch (error) {
      console.error('Error fetching messages from Redis:', error);
      return null;
    }
  }

  router.get('/:roomId', async (req, res) => {
    const { roomId } = req.params;
  
    try {
      // Try fetching from Redis first
      let messagesWithUsername = await getMessagesFromRedis(roomId);
  
      if (messagesWithUsername) {
        res.json({ messageTuples: messagesWithUsername });
      } else {
        // If not found in Redis, fetch from MongoDB
        let messages = await Message.find({ room: roomId }).populate('user', 'username'); // Populate only 'username' field
  
        if (!messages.length) {
          return res.status(404).json({ message: 'No messages found for this room' });
        }
  
        const messageTuples = messages.map(message => ({
          username: message.user.username,
          content: message.content
        }));
        res.json({ messageTuples });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

  app.use('/api/messages', router); // Mount routes
};


