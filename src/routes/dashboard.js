const router = require('express').Router();
const dashCtrl = require('../controllers/dashboardController');
const reportCtrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/stats', dashCtrl.getStats);
router.get('/reports/leads', authorize('admin', 'manager'), reportCtrl.leadsReport);
router.get('/reports/revenue', authorize('admin', 'manager'), reportCtrl.revenueReport);
router.get('/reports/employee-metrics', authorize('admin', 'manager'), reportCtrl.employeeMetrics);
router.get('/reports/agent-performance', authorize('admin', 'manager'), reportCtrl.agentPerformance);

module.exports = router;
