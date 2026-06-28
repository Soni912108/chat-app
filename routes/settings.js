const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');
const logger = require('../utils/logger');

function normalizeValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

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

async function updateProfile(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const nextUsername = normalizeValue(req.body.username);
        const nextEmail = normalizeValue(req.body.email);

        if (!nextUsername || !nextEmail) {
            return res.status(400).json({ message: 'Username and email are required' });
        }

        if (nextUsername !== user.username) {
            const usernameExists = await User.findOne({ username: nextUsername, _id: { $ne: user._id } });
            if (usernameExists) {
                return res.status(400).json({ message: 'Username already exists' });
            }
        }

        if (nextEmail !== user.email) {
            const emailExists = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        user.username = nextUsername;
        user.email = nextEmail;
        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        logger.error('routes/settings:updateProfile', err.message);
        if (err && err.code === 11000) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
}

router.get('/settings', auth, getSettings);
router.post('/settings', auth, updateSettings);
router.get('/me/settings', auth, getSettings);
router.post('/me/settings', auth, updateSettings);
router.patch('/profile', auth, updateProfile);
router.patch('/me/profile', auth, updateProfile);

module.exports = router;
