const router = require('express').Router();
const ctrl = require('../controllers/nonGstBillController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.post('/', ctrl.create);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.delete('/:id', ctrl.delete);

module.exports = router;
