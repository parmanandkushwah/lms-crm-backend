const router = require('express').Router();
const actCtrl = require('../controllers/activityController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', actCtrl.getTasks);
router.get('/upcoming', actCtrl.getUpcoming);

module.exports = router;
