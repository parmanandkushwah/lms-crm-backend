const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const companyCtrl = require('../controllers/companySettingsController');
const nonGstCtrl = require('../controllers/nonGstSettingsController');
const appearanceCtrl = require('../controllers/appearanceSettingsController');
const notificationCtrl = require('../controllers/notificationSettingsController');
const securityCtrl = require('../controllers/securitySettingsController');
const smtpCtrl = require('../controllers/smtpSettingsController');

router.use(authenticate);

router.get('/company', companyCtrl.getCompanySettings);
router.put('/company', companyCtrl.updateCompanySettings);

router.get('/non-gst', nonGstCtrl.getNonGstSettings);
router.put('/non-gst', nonGstCtrl.updateNonGstSettings);

router.get('/appearance', appearanceCtrl.getAppearanceSettings);
router.put('/appearance', appearanceCtrl.updateAppearanceSettings);

router.get('/notifications', notificationCtrl.getNotificationSettings);
router.put('/notifications', notificationCtrl.updateNotificationSettings);

router.get('/security', securityCtrl.getSecuritySettings);
router.put('/security', securityCtrl.updateSecuritySettings);

router.get('/smtp', smtpCtrl.getSMTPSettings);
router.put('/smtp', smtpCtrl.updateSMTPSettings);

module.exports = router;
