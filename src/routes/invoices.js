const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/',
  [body('lead_id').isInt(), body('title').notEmpty()], validate,
  ctrl.create
);
router.put('/:id', ctrl.update);
router.post('/:id/send', ctrl.send);
router.post('/:id/payment',
  [body('amount').isNumeric()], validate,
  ctrl.recordPayment
);
router.patch('/:id/cancel', authorize('admin', 'manager'), ctrl.cancel);
router.delete('/:id', authorize('admin'), ctrl.delete);

module.exports = router;
