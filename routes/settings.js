const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');
const logger = require('../utils/logger');

async function getSettings(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ settings: user.settings || { theme: 'light' } });
    } catch (err) {
        logger.error('routes/settings:get', err.message);
        res.status(500).json({ message: 'Server error' });
    }
}

async function updateSettings(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.settings = {
            theme: req.body.theme === 'dark' ? 'dark' : 'light'
        };
        await user.save();

        res.status(200).json({ settings: user.settings });
    } catch (err) {
        logger.error('routes/settings:update', err.message);
        res.status(500).json({ message: 'Server error' });
    }
}

router.get('/settings', auth, getSettings);
router.post('/settings', auth, updateSettings);
router.get('/me/settings', auth, getSettings);
router.post('/me/settings', auth, updateSettings);

module.exports = router;
