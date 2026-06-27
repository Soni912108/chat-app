const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');  
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only (JPEG, PNG, WebP)!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: fileFilter,
});

async function handleAvatarUpload(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: 'No file selected!' });
    }

    try {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'chat-app/avatars',
                public_id: `avatar_${req.user.id}`,
                overwrite: true,
                resource_type: 'auto',
                quality: 'auto',
                fetch_format: 'auto',
                width: 300,
                height: 300,
                crop: 'fill',
                gravity: 'face',
            },
            async (error, result) => {
                if (error) {
                    logger.error('routes/uploads:avatarCloudinary', error.message);
                    return res.status(500).json({ message: 'Failed to upload avatar' });
                }

                try {
                    const user = await User.findById(req.user.id);
                    user.avatar = result.secure_url;
                    await user.save();

                    res.status(200).json({
                        avatar: result.secure_url,
                        message: 'Avatar uploaded successfully'
                    });
                } catch (dbError) {
                    logger.error('routes/uploads:avatarDatabase', dbError.message);
                    res.status(500).json({ message: 'Avatar uploaded but database update failed' });
                }
            }
        );

        uploadStream.end(req.file.buffer);
    } catch (err) {
        logger.error('routes/uploads:avatar', err.message);
        res.status(500).json({ message: 'Server error during avatar upload' });
    }
}

router.post('/avatar', auth, upload.single('avatar'), handleAvatarUpload);
router.post('/uploadAvatar', auth, upload.single('avatar'), handleAvatarUpload);

module.exports = router;
