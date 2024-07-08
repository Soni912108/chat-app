// routes/room.js
const express = require('express');
const Room = require('../models/Rooms');
const auth = require('../middleware/auth');
const router = express.Router();
const Message = require('../models/Messages');
const User = require('../models/Users');
const { io } = require('../socket');  // Import io from the socket module

//utils
const notifyUsers = require('../utils/notificationFunction');



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


// // Get single room details--used in displaying room owner
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


// Delete/ban a user from a specific room
router.delete('/:roomId/:username', auth, async (req, res) => {
  const { roomId, username } = req.params;

  try {
    const room = await Room.findById(roomId).populate('users', 'username').populate('roomOwner', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log(req.user.id.toString());
    console.log(room.roomOwner._id.toString());

    // Check if the requester is the owner of the room
    const isOwner = req.user.id.toString() === room.roomOwner._id.toString();

    if (!isOwner) {
      return res.status(403).json({ message: 'You are not the owner of this room.'});
    }

    const userToRemove = room.users.find(user => user.username === username);
    if (!userToRemove) {
      return res.status(404).json({ message: 'User not found in this room' });
    }

    // Remove the user from the users list and add to banned list
    room.users = room.users.filter(user => user._id.toString() !== userToRemove._id.toString());
    room.banned.push(userToRemove._id);
    await room.save();

    // Delete the user's messages from the room
    await Message.deleteMany({ room: roomId, user: userToRemove._id });

    // Notify the banned user
    io.to(userToRemove._id.toString()).emit('userBanned', 'You have been banned from the room. Redirecting to dashboard.');
    
    res.status(200).json({ message: 'User banned and messages deleted successfully' });
  } catch (error) {
    console.error('Error banning user and deleting messages:', error);
    res.status(500).json({ message: 'Internal server error' });
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
  const { name, owner,private } = req.body; //isPrivate must be a boolean value
  console.log(req.body);
  try {
    const room = new Room({ name, users: [req.user.id] ,roomOwner: owner,isPrivate: private});
    
    await room.save();
    
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// Route to make users join a room
router.post('/:roomId/join', auth, async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username');
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Check if the user is banned
    const isBanned = room.banned.includes(req.user.id);
    if (isBanned) return res.status(403).json({ message: 'You are banned from this room' });

    const isOwner = req.user.id.toString() === room.roomOwner._id.toString();

    if (room.isPrivate) {
      // If room is private, check if user is already a member or has a pending request
      const userAlreadyInRoom = room.users.includes(req.user.id);
      const joinRequestExists = room.pendingRequests.includes(req.user.id);

      if (userAlreadyInRoom) {
        return res.status(200).json({ message: 'Already a member of the room' });
      }

      if (joinRequestExists) {
        return res.status(200).json({ message: 'Join request already sent to the room owner' });
      }

      // Add to pending requests
      room.pendingRequests.push(req.user.id);
      await room.save();

      // Send notification to room owner
      const user = await User.findById(req.user.id);
      const message = `User ${user.username} wants to join your private room ${room.name}. Time: ${new Date().toLocaleString()}`;
      await notifyUsers(req.user.id, room.roomOwner._id, message, roomId);

      return res.status(201).json({ message: 'Request to join private room sent to the room owner' });
    } else {
      // If room is public, add the user if they are not already a member
      if (!room.users.includes(req.user.id)) {
        room.users.push(req.user.id);
        await room.save();
        return res.status(201).json({
          message: 'Joined room',
          isOwner,
          room: { ...room._doc }
        });
      }

      return res.status(200).json({ message: 'Already a member of the room' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// Route to accept a user's request to join a specific room
router.post('/:roomId/:userId/accept', auth, async (req, res) => {
  const { roomId, userId } = req.params;

  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isOwner = req.user.id.toString() === room.roomOwner.toString();
    if (!isOwner) return res.status(403).json({ message: 'Only the room owner can accept join requests' });

    if (room.pendingRequests.includes(userId)) {
      room.users.push(userId);
      room.pendingRequests = room.pendingRequests.filter(id => id.toString() !== userId.toString());
      await room.save();

      // Optionally, notify the user that they have been added to the room
      const message = `Your request to join the room ${room.name} has been accepted.`;
      await notifyUsers(req.user.id, userId, message, roomId);

      return res.status(201).json({ message: 'User added to the room' });
    } else {
      return res.status(400).json({ message: 'No pending request found for this user' });
    }
  } catch (error) {
    console.error('Error accepting join request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;
