// routes/userAuth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const router = express.Router();
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {

    const ifUser = await User.findOne({ username });
    if (ifUser) {
      return res.status(400).json({ message: 'User already exists' });
    } else {

      const user = new User({ username, password });
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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, userID: user._id, userName: user.username }); // Change 401 to 200

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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password in the database
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error in /changePassword:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;