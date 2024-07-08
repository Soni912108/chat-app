const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Fetch notifications for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a notification as read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to mark this notification as read' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});




// Delete the notification from the notifications table if user requests it
router.delete('/:id/delete', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this notification' });
    }

    // Delete the notification from the database
    await notification.deleteOne();

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/newNotifications', auth, async (req, res) =>  {
  try{
    const unreadNotifications = await Notification.find({ recipient: req.user.id, read: false }).countDocuments();
    res.status(200).json({ unreadNotifications });
  }
  catch(error){
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
