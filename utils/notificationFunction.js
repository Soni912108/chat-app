// utils/notificationFunction.js

const Notification = require('../models/Notification');
const { io } = require('../socket');  // Import io from the socket module


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
    io.to(recipient.toString()).emit('notification', unreadCount);

    console.log(`Notification sent to user ${recipient}: ${message} from ${sender}`);
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}




module.exports = notifyUsers;
