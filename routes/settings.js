const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');
const logger = require('../utils/logger');

router.get('/settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ settings: user.settings });
    } catch (err) {
        logger.error('routes/settings:get', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.settings = req.body;
        await user.save();

        res.status(200).json({ settings: user.settings });
    } catch (err) {
        logger.error('routes/settings:update', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
