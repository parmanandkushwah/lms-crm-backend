const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/quotationController');
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
router.patch('/:id/viewed', ctrl.markViewed);
router.post('/:id/convert-to-invoice',
  [body('due_date').optional().isDate()], validate,
  ctrl.convertToInvoice
);
router.delete('/:id', authorize('admin', 'manager'), ctrl.delete);

module.exports = router;
