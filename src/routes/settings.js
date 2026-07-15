const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const companyCtrl = require('../controllers/companySettingsController');
const appearanceCtrl = require('../controllers/appearanceSettingsController');
const notificationCtrl = require('../controllers/notificationSettingsController');
const securityCtrl = require('../controllers/securitySettingsController');
const smtpCtrl = require('../controllers/smtpSettingsController');

router.use(authenticate);

router.get('/company', companyCtrl.getCompanySettings);
router.put('/company', companyCtrl.updateCompanySettings);

router.get('/appearance', appearanceCtrl.getAppearanceSettings);
router.put('/appearance', appearanceCtrl.updateAppearanceSettings);

router.get('/notifications', notificationCtrl.getNotificationSettings);
router.put('/notifications', notificationCtrl.updateNotificationSettings);

router.get('/security', securityCtrl.getSecuritySettings);
router.put('/security', securityCtrl.updateSecuritySettings);

router.get('/smtp', smtpCtrl.getSMTPSettings);
router.put('/smtp', smtpCtrl.updateSMTPSettings);

module.exports = router;
