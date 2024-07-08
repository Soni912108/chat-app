//models/Notifications.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  sender : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, //current users id
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  roomId : { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
