// utils/notificationFunction.js

const Notification = require('../models/Notification');
const logger = require('./logger');
const { getIo } = require('./socketState');


async function notifyUsers(sender, recipient, message, roomId) {
  try {
    const notification = new Notification({
      sender: sender,
      recipient: recipient,
      message: message,
      roomId: roomId
    });

    await notification.save();

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ recipient: recipient, read: false });
    // Emit the notification to the user via WebSocket
    const io = getIo();
    io.to(recipient.toString()).emit('notification', unreadCount);

    logger.debug('notifications/emit', `Notification sent to user ${recipient} from ${sender}`);
  } catch (error) {
    logger.error('notifications/emit', error.message);
  }
}




module.exports = notifyUsers;
