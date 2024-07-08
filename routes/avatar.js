const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');  
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars');
    },
    filename: (req, file, cb) => {
        cb(null, req.user.id + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB limit
    fileFilter: fileFilter,
});

router.post('/uploadAvatar', auth, upload.single('avatar'), async (req, res) => {
    if (req.file == undefined) {
        return res.status(400).json({ message: 'No file selected!' });
    }

    // Update user's avatar in the database
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    try {
        const user = await User.findById(req.user.id);
        if (user.avatar && user.avatar !== avatarPath) {
            fs.unlinkSync(path.join(__dirname, '..', user.avatar));
        }
        user.avatar = avatarPath;
        await user.save();
        res.status(200).json({ avatar: avatarPath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
