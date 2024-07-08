
// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roomOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  banned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, required: true },
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Add pending requests field
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
