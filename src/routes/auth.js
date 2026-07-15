const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { uploadAvatar } = require('../middlewares/upload');

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()], validate,
  ctrl.login
);
router.post('/refresh', ctrl.refresh);
router.post('/forgot-password', [body('email').isEmail()], validate, ctrl.forgotPassword);
router.post('/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min: 6 })], validate,
  ctrl.resetPassword
);

// Protected
router.use(authenticate);
router.get('/me', ctrl.me);
router.put('/profile', uploadAvatar, ctrl.updateProfile);
router.put('/change-password',
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })], validate,
  ctrl.changePassword
);
router.post('/logout', ctrl.logout);

module.exports = router;
