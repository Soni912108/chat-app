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
  console.log('Rooms listing request - User ID:', req.user.id);
  
  try {
    console.log('Rooms listing - Fetching rooms from database...');
    
    const rooms = await Room.find().populate('roomOwner', 'username')
                           .populate('users', 'username');
    
    console.log('Rooms listing - Rooms found:', rooms.length);
    
    if (!rooms || !rooms.length) {
      console.log('Rooms listing - No rooms found');
      return res.status(200).json({ 
        rooms: [], 
        message: 'No rooms found' 
      });
    }

    console.log('Rooms listing - Returning rooms to client');
    res.json({ rooms });
  } catch (error) {
    console.error('Error in /api/rooms:', error); // Debug logging
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// // Get single room details--used in displaying room owner
router.get('/:roomId', auth, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username').populate('users', 'username');
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isMember = room.users.map(u => u._id.toString()).includes(userId);
    if (room.isPrivate && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

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

    // Check if the requester is the owner of the room
    const isOwner = req.user.id.toString() === room.roomOwner._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: 'You are not the owner of this room.' });
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

    // Notify the banned user via socket
    io.to(userToRemove._id.toString()).emit('userBanned', 'You have been banned from the room. Redirecting to dashboard.');
    
    // Also create a notification record for the banned user
    const message = `You have been banned from the room ${room.name}`;
    await notifyUsers(req.user.id, userToRemove._id, message, roomId);

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
  console.log('Room creation request - Body:', req.body);
  console.log('Room creation request - User ID:', req.user.id);
  
  const { name, private: isPrivate } = req.body; //isPrivate must be a boolean value
  
  try {
    console.log('Room creation - Creating room with name:', name, 'isPrivate:', isPrivate);
    
    const room = new Room({ 
      name, 
      users: [req.user.id], 
      roomOwner: req.user.id, 
      isPrivate: isPrivate
    });
    
    console.log('Room creation - Room object created:', room);
    
    await room.save();
    
    console.log('Room creation - Room saved successfully:', room._id);
    
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    console.error('Room creation - Error:', error);
    res.status(400).json({ message: error.message });
  }
});



// Route to make users join a room
router.post('/:roomId/join', auth, async (req, res) => {
  console.log('Room join request - Room ID:', req.params.roomId);
  console.log('Room join request - User ID:', req.user.id);
  
  const { roomId } = req.params;
  const userId = req.user.id;
  const room = await Room.findById(roomId).populate('roomOwner', 'username');

  if (!room) {
    console.log('Room join request - Room not found');
    return res.status(404).json({ message: 'Room not found' });
  }

  console.log('Room join request - Room found:', room.name);
  console.log('Room join request - Room owner:', room.roomOwner._id);
  console.log('Room join request - Room users:', room.users);
  console.log('Room join request - Room banned:', room.banned);

  const isMember = room.users.map(u => u.toString()).includes(userId);
  const isOwner = room.roomOwner._id.toString() === userId;
  const isBanned = room.banned.map(u => u.toString()).includes(userId);
  
  console.log("isBanned:", isBanned);
  console.log("isMember:", isMember);
  console.log("isOwner:", isOwner);
  console.log("room.isPrivate:", room.isPrivate);
  console.log("room.pendingRequests:", room.pendingRequests);
  console.log("room.users:", room.users);
  console.log("room.roomOwner:", room.roomOwner);
  console.log("room.name:", room.name);
  console.log("room.id:", room.id);
  console.log("room.createdAt:", room.createdAt);
  console.log("room.updatedAt:", room.updatedAt);
  
  if (isBanned) {
    console.log('Room join request - User is banned');
    return res.status(403).json({ message: 'You are banned from this room' });
  }

  if (room.isPrivate && !isMember && !isOwner) {
    console.log('Room join request - Private room, sending join request');
    // Only allow sending a join request, not joining directly
    const joinRequestExists = room.pendingRequests.map(u => u.toString()).includes(userId);
    if (joinRequestExists) {
      console.log('Room join request - Join request already exists');
      return res.status(200).json({ message: 'Join request already sent to the room owner' });
    }
    room.pendingRequests.push(userId);
    await room.save();
    console.log('Room join request - Join request sent');
    
    // Notify the room owner about the join request
    const user = await User.findById(userId);
    const username = user ? user.username : 'Unknown user';
    const message = `${username} wants to join your private room ${room.name}`;
    await notifyUsers(userId, room.roomOwner, message, roomId);
    
    return res.status(201).json({ message: 'Request to join private room sent to the room owner' });
  }

  // If already a member or owner
  if (isMember || isOwner) {
    console.log('Room join request - User is already a member or owner');
    return res.status(200).json({ message: 'Already a member of the room' });
  }

  // If public and not banned, add user
  console.log('Room join request - Adding user to public room');
  room.users.push(userId);
  await room.save();
  
  // Notify the room owner about the new member
  const user = await User.findById(userId);
  const username = user ? user.username : 'Unknown user';
  const message = `${username} has joined your public room ${room.name}`;
  await notifyUsers(userId, room.roomOwner, message, roomId);
  
  console.log('Room join request - User successfully joined room');
  return res.status(201).json({ message: 'Joined room', isOwner, room: { ...room._doc } });
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
