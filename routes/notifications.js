const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');


// Fetch notifications for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const filter = { recipient: req.user.id };
    const [notifications, totalNotifications, unreadNotifications] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: false })
    ]);

    logger.debug('routes/notifications:list', `Returned ${notifications.length} notifications for user ${req.user.id} page=${page} limit=${limit}`);
    
    res.status(200).json({
      notifications,
      page,
      limit,
      totalNotifications,
      totalPages: Math.max(Math.ceil(totalNotifications / limit), 1),
      unreadNotifications
    });
  } catch (error) {
    logger.error('routes/notifications:list', error.message);
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

    if (notification.read) {
      return res.status(200).json({ message: 'Notification already read' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('routes/notifications:read', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      message: result.modifiedCount || result.nModified || 0
        ? 'All notifications marked as read'
        : 'All notifications were already read',
      modifiedCount: result.modifiedCount || result.nModified || 0
    });
  } catch (error) {
    logger.error('routes/notifications:markAllRead', error.message);
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
    logger.error('routes/notifications:delete', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/newNotifications', auth, async (req, res) =>  {
  try{
    const unreadNotifications = await Notification.find({ recipient: req.user.id, read: false }).countDocuments();
    res.status(200).json({ unreadNotifications });
  }
  catch(error){
    logger.error('routes/notifications:count', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
