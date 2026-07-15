const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/',
  authorize('admin', 'manager'),
  [body('name').notEmpty(), body('price').isNumeric()], validate,
  ctrl.create
);
router.put('/:id', authorize('admin', 'manager'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.delete);

module.exports = router;
