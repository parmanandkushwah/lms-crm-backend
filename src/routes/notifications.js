const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/unread-count', ctrl.getUnreadCount);
router.patch('/:id/read', ctrl.markRead);
router.patch('/mark-all-read', ctrl.markAllRead);
router.delete('/:id', ctrl.delete);

module.exports = router;
