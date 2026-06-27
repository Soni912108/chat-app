// routes/userAuth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const router = express.Router();
const Room = require('../models/Rooms');
const auth = require('../middleware/auth');
const Messages = require('../models/Messages');
const logger = require('../utils/logger');

require('dotenv').config();


router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const existingEmail = await User.findOne({ email });
    const existingUsername = await User.findOne({ username });

    if (existingEmail && existingUsername) {
      return res.status(400).json({ message: 'Username and email combination already exists.' });
    } else if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists.' });
    } else if (existingUsername) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const user = new User({ email, username, password });
    user.lastLogin = Date.now();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });

    res.status(200).json({ userID: user._id, userName: user.username }); // No token in body
  } catch (error) {
    logger.warn('routes/auth:register', error.message);
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

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });

    res.status(200).json({ userID: user._id, userName: user.username }); // No token in body
  } catch (error) {
    logger.warn('routes/auth:login', error.message);
    res.status(400).json({ message: error.message });
  }
});





// Route to change password
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    // Retrieve user from database
    const user = await User.findById(req.user.id);
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
    logger.error('routes/auth:changePassword', error.message);
    res.status(500).json({ message: 'Server error' });
  }
}

router.post('/changePassword', auth, changePassword);
router.post('/me/password', auth, changePassword);



// Route to display profileInfo to the logged in user
async function getProfileInfo(req, res) {
  try {
    const userId = req.params.userId || req.user.id;
    const isLegacyRoute = Boolean(req.params.userId);

    if (isLegacyRoute && userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

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

    // Return the user's profile information as JSON response
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
    logger.error('routes/auth:profileInfo', error.message);
    res.status(500).json({ message: 'Server error' });
  }
}

router.get('/profileInfo/:userId', auth, getProfileInfo);
router.get('/me/profile', auth, getProfileInfo);


// Route to logout user (clear authentication cookie)
router.post('/logout', (req, res) => {
  try {
    // Clear the authentication cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('routes/auth:logout', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to verify authentication token
async function verifyAuth(req, res) {
  try {
    // If we reach here, the auth middleware has already verified the token
    // and req.user contains the user information
    const user = await User.findById(req.user.id).select('username email');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'Token is valid', 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (error) {
    logger.error('routes/auth:verify', error.message);
    res.status(500).json({ message: 'Server error' });
  }
}

router.get('/verify', auth, verifyAuth);
router.get('/me', auth, verifyAuth);

module.exports = router;
