const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), ctrl.getAll);
router.get('/:id', authorize('admin', 'manager'), ctrl.getOne);
router.post('/',
  authorize('admin'),
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 }), body('role').isIn(['admin', 'manager', 'agent'])],
  validate,
  ctrl.create
);
router.put('/:id', authorize('admin'), ctrl.update);
router.patch('/:id/toggle-status', authorize('admin'), ctrl.toggleStatus);
router.patch('/:id/reset-password',
  authorize('admin'),
  [body('password').isLength({ min: 6 })], validate,
  ctrl.resetPassword
);

module.exports = router;
