const router = require('express').Router();
const actCtrl = require('../controllers/activityController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', actCtrl.getFollowUps);

module.exports = router;
