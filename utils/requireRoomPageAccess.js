const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const Room = require('../models/Rooms');
const { getRoomAccess } = require('./roomAccess');

async function requireRoomPageAccess(req, res, next) {
  try {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId.trim() : '';
    if (!roomId) {
      return res.status(404).sendFile(require('path').join(__dirname, '..', 'public', 'templates', '404.html'));
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    if (!token) {
      return res.redirect('/login?message=loggedOut');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.redirect('/login?message=loggedOut');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).sendFile(require('path').join(__dirname, '..', 'public', 'templates', '404.html'));
    }

    const { isMember, isOwner, isBanned } = getRoomAccess(room, decoded.id);
    if (isBanned || (!isMember && !isOwner)) {
      return res.status(404).sendFile(require('path').join(__dirname, '..', 'public', 'templates', '404.html'));
    }

    req.room = room;
    req.authUser = decoded;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireRoomPageAccess;
