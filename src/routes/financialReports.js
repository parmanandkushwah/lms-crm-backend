const router = require('express').Router();
const ctrl = require('../controllers/financialReportController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/summary', authorize('admin', 'manager'), ctrl.getFinancialSummary);
router.get('/sales-register', authorize('admin', 'manager'), ctrl.getSalesRegister);
router.get('/purchase-register', authorize('admin', 'manager'), ctrl.getPurchaseRegister);

module.exports = router;
