// routes/userAuth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const router = express.Router();
const Room = require('../models/Rooms');
const auth = require('../middleware/auth');
const Messages = require('../models/Messages');


router.post('/register', async (req, res) => {
  const {email, username, password } = req.body;
  try {

    const existingUser = await User.findOne({ email, username });

    if (existingUser) {
      return res.status(400).json({ message: 'Username and email combination already exists.' });
    } else {

      const user = new User({email, username, password });
      user.lastLogin = Date.now(); // Update with current timestamp
      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ token, userID: user._id, userName: user.username }); // Change 401 to 200
      
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date(); // Update the lastLogin with current timestamp
    await user.save(); // Save the updated user to the database

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, userID: user._id, userName: user.username });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});





// Route to change password
router.post('/changePassword', auth, async (req, res) => {
  try {
    const { userID, oldPassword, newPassword } = req.body;

    // Retrieve user from database
    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if old password matches
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid old password' });
    }

    // Update user's password
    user.password = newPassword; // This will trigger the pre-save hook to hash the password
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error in /changePassword:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Route to display profileInfo to the logged in user
router.get('/profileInfo/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Retrieve user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lastLogin = user.lastLogin;
    const email = user.email;
    const joinedDate = user.createdAt;
    const username = user.username;
    const avatar = user.avatar;
    // Get the rooms where the user is the owner
    const roomsWhereAdmin = await Room.find({ roomOwner: userId }, { name: 1, _id: 1 });
    const roomDetails = roomsWhereAdmin.map(room => ({ name: room.name, _id: room._id }));

    // Get the number of rooms created by the user
    const roomsCreatedCount = roomsWhereAdmin.length;

    // Get the rooms the user has joined
    const roomsJoined = await Room.find({ users: userId }, { name: 1, _id: 1 });
    const roomsJoinedCount = roomsJoined.length;

    // Get the number of messages sent by the user
    const messagesSentCount = await Messages.countDocuments({ user: userId });

    // Get recent activity (e.g., recent messages sent by the user)
    const recentActivity = await Messages.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('room', 'name')
      .populate('user', 'username');

    const recentActivityFormatted = recentActivity.map(message => ({
      content: message.content,
      timestamp: message.timestamp,
      roomName: message.room.name,
      username: message.user.username,
    }));

    res.status(200).json({
      username,
      email,
      joinedDate,
      lastLogin,
      avatar,
      roomDetails,
      roomsCreatedCount,
      roomsJoinedCount,
      messagesSentCount,
      recentActivity: recentActivityFormatted,
    });
  } catch (error) {
    console.error('Error in /profileInfo:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;