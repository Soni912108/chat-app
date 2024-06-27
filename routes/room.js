// routes/room.js
const express = require('express');
const Room = require('../models/Rooms');
const auth = require('../middleware/auth');
const router = express.Router();
const Message = require('../models/Messages');

// Fetch all rooms
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find();
    if (!rooms.length) return res.status(200).json({ rooms: [], message: 'No rooms found' });  // Note the change here
    res.json({ rooms });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// Get single room details
router.get('/:roomId', auth, async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username').populate('users', 'username');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// Delete single room details and associated messages
router.delete('/:roomId', auth, async (req, res) => {
  const { roomId } = req.params;
  const currentUser = req.user.id; // 'user' object from middleware, auth

  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Convert roomOwner to string if necessary for comparison
    const roomOwnerString = room.roomOwner.toString();

    // Check if current user is the room owner
    if (roomOwnerString !== currentUser) {
      return res.status(401).json({ message: 'Unauthorized: You are not the room owner' });
    }

    // Delete all messages associated with the room
    await Message.deleteMany({ room: roomId });

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    res.json({ message: 'Room and associated messages deleted successfully' });
  } catch (error) {
    console.error('Error deleting room and messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/create',auth, async (req, res) => {
  const { name,owner } = req.body;

  try {
    const room = new Room({ name, users: [req.user.id] ,roomOwner: owner});
    
    await room.save();
    
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:roomId/join', auth, async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username'); // Populate owner information
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isOwner = req.user.id.toString() === room.roomOwner._id.toString(); // Compare user ID with owner ID

    if (!room.users.includes(req.user.id)) {
      room.users.push(req.user.id);
    }

    await room.save();

    res.status(201).json({
      message: isOwner ? 'Joined room as owner' : 'Joined room',
      room: { ...room._doc, isOwner } // Include 'isOwner' property in response
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


module.exports = router;
