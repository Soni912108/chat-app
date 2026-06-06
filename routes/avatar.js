const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');  
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

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

router.post('/uploadAvatar', auth, upload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file selected!' });
    }

    try {
        // Upload to Cloudinary directly from buffer
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'chat-app/avatars', // Organize in Cloudinary dashboard
                public_id: `avatar_${req.user.id}`, // Unique ID per user
                overwrite: true, // Replace old avatar with same user ID
                resource_type: 'auto',
                quality: 'auto', // Cloudinary auto-optimizes quality
                fetch_format: 'auto', // Serve optimal format for client browser
                width: 300, // Resize to 300x300 for consistency
                height: 300,
                crop: 'fill',
                gravity: 'face', // Smart crop centered on face if detected
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ message: 'Failed to upload avatar' });
                }

                try {
                    // Update user's avatar URL in database
                    const user = await User.findById(req.user.id);
                    user.avatar = result.secure_url; // Use secure HTTPS URL
                    await user.save();
                    
                    res.status(200).json({ 
                        avatar: result.secure_url,
                        message: 'Avatar uploaded successfully'
                    });
                } catch (dbError) {
                    console.error('Database update error:', dbError);
                    res.status(500).json({ message: 'Avatar uploaded but database update failed' });
                }
            }
        );

        // Pipe file buffer to upload stream
        uploadStream.end(req.file.buffer);
    } catch (err) {
        console.error('Avatar upload error:', err);
        res.status(500).json({ message: 'Server error during avatar upload' });
    }
});

module.exports = router;
