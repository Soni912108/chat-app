// routes/room.js
const express = require('express');
const Room = require('../models/Rooms');
const auth = require('../middleware/auth');
const router = express.Router();
const Message = require('../models/Messages');
const User = require('../models/Users');
const logger = require('../utils/logger');
const { getIo } = require('../utils/socketState');
const { getRoomAccess, objectIdListIncludes } = require('../utils/roomAccess');

const notifyUsers = require('../utils/notificationFunction');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fetch all rooms
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: 'i' };
    }

    const [rooms, totalRooms] = await Promise.all([
      Room.find(filter)
        .populate('roomOwner', 'username')
        .select('name roomOwner users banned isPrivate pendingRequests createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Room.countDocuments(filter)
    ]);

    const safeRooms = rooms.map(room => ({
      _id: room._id,
      name: room.name,
      roomOwner: room.roomOwner,
      isPrivate: room.isPrivate,
      isMember: objectIdListIncludes(room.users, req.user.id),
      isBanned: objectIdListIncludes(room.banned, req.user.id),
      hasPendingRequest: objectIdListIncludes(room.pendingRequests || [], req.user.id),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));
    
    res.json({
      rooms: safeRooms,
      page,
      limit,
      totalRooms,
      totalPages: Math.max(Math.ceil(totalRooms / limit), 1),
      search
    });
  } catch (error) {
    logger.error('routes/rooms:list', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// // Get single room details--used in displaying room owner
router.get('/:roomId', auth, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username').populate('users', 'username');
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const { isMember, isBanned } = getRoomAccess(room, userId);
    if (isBanned) {
      return res.status(403).json({ message: 'You are banned from this room' });
    }
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ room });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// Transfer room ownership to another existing room member
router.post('/:roomId/transfer', auth, async (req, res) => {
  const { roomId } = req.params;
  const { targetUsername } = req.body;

  if (!targetUsername || !targetUsername.trim()) {
    return res.status(400).json({ message: 'Target username is required' });
  }

  try {
    const room = await Room.findById(roomId).populate('users', 'username').populate('roomOwner', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isOwner = req.user.id.toString() === room.roomOwner._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: 'You are not the owner of this room.' });
    }

    const targetUser = room.users.find(user => user.username === targetUsername.trim());
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found in this room' });
    }

    if (targetUser._id.toString() === room.roomOwner._id.toString()) {
      return res.status(400).json({ message: 'That user is already the room owner' });
    }

    room.roomOwner = targetUser._id;
    if (!objectIdListIncludes(room.users, targetUser._id)) {
      room.users.push(targetUser._id);
    }

    await room.save();

    const io = getIo();
    io.to(roomId.toString()).emit('roomOwnershipTransferred', {
      message: `Room ownership transferred to ${targetUser.username}.`,
      roomOwner: { _id: targetUser._id, username: targetUser.username }
    });

    await notifyUsers(
      req.user.id,
      targetUser._id,
      `Ownership of room ${room.name} was transferred to you.`,
      roomId
    );

    res.status(200).json({
      message: 'Room ownership transferred successfully',
      roomOwner: { _id: targetUser._id, username: targetUser.username }
    });
  } catch (error) {
    logger.error('routes/rooms:transferOwnership', error.message);
    res.status(500).json({ message: 'Internal server error' });
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

    if (userToRemove._id.toString() === room.roomOwner._id.toString()) {
      return res.status(403).json({
        message: 'Room owners cannot ban themselves. Delete the room or transfer ownership instead.'
      });
    }

    // Remove the user from the users list and add to banned list
    room.users = room.users.filter(user => user._id.toString() !== userToRemove._id.toString());
    room.banned.push(userToRemove._id);
    await room.save();

    // Delete the user's messages from the room
    await Message.deleteMany({ room: roomId, user: userToRemove._id });

    // Notify the banned user via socket
    const io = getIo();
    io.to(userToRemove._id.toString()).emit('userBanned', 'You have been banned from the room. Redirecting to dashboard.');
    
    // Also create a notification record for the banned user
    const message = `You have been banned from the room ${room.name}`;
    await notifyUsers(req.user.id, userToRemove._id, message, roomId);

    res.status(200).json({ message: 'User banned and messages deleted successfully' });
  } catch (error) {
    logger.error('routes/rooms:banUser', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Rename a room
router.patch('/:roomId/rename', auth, async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;
  const newName = typeof name === 'string' ? name.trim() : '';

  if (!newName) {
    return res.status(400).json({ message: 'Room name is required' });
  }

  if (newName.length > 60) {
    return res.status(400).json({ message: 'Room name must be 60 characters or less' });
  }

  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isOwner = req.user.id.toString() === room.roomOwner._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: 'You are not the owner of this room.' });
    }

    const previousName = room.name;
    room.name = newName;
    await room.save();

    const io = getIo();
    io.to(roomId.toString()).emit('roomRenamed', {
      message: `Room renamed to ${newName}.`,
      room: { _id: room._id, name: newName }
    });

    for (const userId of room.users) {
      if (userId.toString() === req.user.id.toString()) {
        continue;
      }

      await notifyUsers(
        req.user.id,
        userId,
        `Room ${previousName} was renamed to ${newName}.`,
        roomId
      );
    }

    res.status(200).json({
      message: 'Room renamed successfully',
      room: { _id: room._id, name: newName }
    });
  } catch (error) {
    logger.error('routes/rooms:rename', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Leave a room as a regular member
router.post('/:roomId/leave', auth, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const room = await Room.findById(roomId).populate('users', 'username').populate('roomOwner', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isOwner = userId.toString() === room.roomOwner._id.toString();
    if (isOwner) {
      return res.status(403).json({
        message: 'Room owners cannot leave their own room. Delete the room or transfer ownership instead.'
      });
    }

    const isMember = objectIdListIncludes(room.users, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    room.users = room.users.filter(user => user._id.toString() !== userId.toString());
    room.pendingRequests = (room.pendingRequests || []).filter(id => id.toString() !== userId.toString());
    await room.save();

    const updatedRoom = await Room.findById(roomId).populate('users', 'username');
    const io = getIo();
    io.to(roomId.toString()).emit('updateUserList', updatedRoom.users || []);

    const leavingUser = await User.findById(userId).select('username');
    await notifyUsers(
      userId,
      room.roomOwner._id,
      `${leavingUser ? leavingUser.username : 'A member'} left the room ${room.name}.`,
      roomId
    );

    res.status(200).json({ message: 'You left the room successfully' });
  } catch (error) {
    logger.error('routes/rooms:leave', error.message);
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
    logger.error('routes/rooms:delete', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/create',auth, async (req, res) => {
  const { name, private: isPrivate } = req.body; //isPrivate must be a boolean value
  
  try {
    const room = new Room({ 
      name, 
      users: [req.user.id], 
      roomOwner: req.user.id, 
      isPrivate: isPrivate
    });
    
    await room.save();
    logger.info('routes/rooms:create', `Room ${room._id} created by user ${req.user.id}`);
    
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    logger.error('routes/rooms:create', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Route to make users join a room
router.post('/:roomId/join', auth, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  
  try {
    const room = await Room.findById(roomId).populate('roomOwner', 'username');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const { isMember, isOwner, isBanned } = getRoomAccess(room, userId);
    
    if (isBanned) {
      return res.status(403).json({ message: 'You are banned from this room' });
    }

    if (room.isPrivate && !isMember && !isOwner) {
      const joinRequestExists = objectIdListIncludes(room.pendingRequests, userId);
      if (joinRequestExists) {
        return res.status(200).json({ message: 'Join request already sent to the room owner' });
      }
      room.pendingRequests.push(userId);
      await room.save();
      
      const user = await User.findById(userId);
      const username = user ? user.username : 'Unknown user';
      const message = `${username} wants to join your private room ${room.name}`;
      await notifyUsers(userId, room.roomOwner, message, roomId);
      
      return res.status(201).json({ message: 'Request to join private room sent to the room owner' });
    }

    if (isMember || isOwner) {
      return res.status(200).json({ message: 'Already a member of the room' });
    }

    room.users.push(userId);
    await room.save();
    
    const user = await User.findById(userId);
    const username = user ? user.username : 'Unknown user';
    const message = `${username} has joined your public room ${room.name}`;
    await notifyUsers(userId, room.roomOwner, message, roomId);
    
    return res.status(201).json({ message: 'Joined room', isOwner, room: { ...room._doc } });
  } catch (error) {
    logger.error('routes/rooms:join', error.message);
    return res.status(500).json({ message: error.message });
  }
});



// Cancel a pending join request
router.post('/:roomId/join-request/cancel', auth, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const { isMember, isOwner, isBanned } = getRoomAccess(room, userId);
    logger.debug('routes/rooms:cancelJoinRequest', `User ${userId} attempting to cancel join request for room ${roomId}. isMember: ${isMember}, isOwner: ${isOwner}, isBanned: ${isBanned}`);
    if (isBanned) {
      return res.status(403).json({ message: 'You are banned from this room' });
    }

    if (isMember || isOwner) {
      return res.status(400).json({ message: 'You are already a member of this room' });
    }

    const requestExists = objectIdListIncludes(room.pendingRequests, userId);
    if (!requestExists) {
      return res.status(404).json({ message: 'No pending join request found' });
    }

    room.pendingRequests = room.pendingRequests.filter(id => id.toString() !== userId.toString());
    await room.save();

    res.status(200).json({ message: 'Join request cancelled' });
  } catch (error) {
    logger.error('routes/rooms:cancelJoinRequest', error.message);
    res.status(500).json({ message: 'Internal server error' });
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

    if (objectIdListIncludes(room.pendingRequests, userId)) {
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
    logger.error('routes/rooms:accept', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;
