const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Test route to create a notification (for debugging)
router.post('/test', auth, async (req, res) => {
  try {
    console.log('Creating test notification for user:', req.user.id);
    const testNotification = new Notification({
      sender: req.user.id,
      recipient: req.user.id,
      message: 'This is a test notification',
      roomId: 'test-room-123'
    });
    
    await testNotification.save();
    console.log('Test notification created:', testNotification);
    
    res.status(200).json({ message: 'Test notification created', notification: testNotification });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug route to list all notifications (for debugging)
router.get('/debug/all', auth, async (req, res) => {
  try {
    console.log('Fetching all notifications for debugging...');
    const allNotifications = await Notification.find({}).sort({ createdAt: -1 }).lean();
    console.log('All notifications in database:', allNotifications);
    res.status(200).json({ 
      message: 'All notifications retrieved', 
      count: allNotifications.length,
      notifications: allNotifications 
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch notifications for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching notifications for user:', req.user.id);
    console.log('User ID type:', typeof req.user.id);
    console.log('User ID value:', req.user.id);
    
    const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).lean();
    console.log('Found notifications:', notifications);
    console.log('Number of notifications:', notifications.length);
    
    // Log each notification recipient for debugging
    notifications.forEach((notification, index) => {
      console.log(`Notification ${index + 1} recipient:`, {
        recipient: notification.recipient,
        recipientType: typeof notification.recipient,
        userID: req.user.id,
        userIDType: typeof req.user.id,
        match: notification.recipient.toString() === req.user.id.toString()
      });
    });
    
    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
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
