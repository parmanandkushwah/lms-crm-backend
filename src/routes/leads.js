const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/leadController');
const actCtrl = require('../controllers/activityController');
const fileCtrl = require('../controllers/fileController');
const contactCtrl = require('../controllers/contactController');
const quotCtrl = require('../controllers/quotationController');
const invCtrl = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadLeadFile } = require('../middlewares/upload');
const validate = require('../middlewares/validate');

router.use(authenticate);

// Lead CRUD
router.get('/', ctrl.getAll);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getOne);
router.post('/',
  [body('title').notEmpty(), body('contact_name').notEmpty()], validate,
  ctrl.create
);
router.put('/:id', ctrl.update);
router.patch('/:id/status',
  [body('status').isIn(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'on_hold'])], validate,
  ctrl.updateStatus
);
router.patch('/:id/assign',
  authorize('admin', 'manager'),
  [body('assigned_to').optional().custom(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') return /^\d+$/.test(v);
    if (Array.isArray(v)) return v.every(x => typeof x === 'number' || /^\d+$/.test(x));
    return false;
  }).withMessage('assigned_to must be an integer or array of integers'), validate],
  ctrl.assign
);
router.delete('/:id', authorize('admin', 'manager'), ctrl.delete);

// Activities
router.get('/:leadId/activities', actCtrl.getByLead);
router.post('/:leadId/activities', [body('type').notEmpty()], validate, actCtrl.create);
router.put('/activities/:id', actCtrl.update);
router.delete('/activities/:id', actCtrl.delete);
router.patch('/activities/:id/pin', actCtrl.pin);

// Files
router.get('/:leadId/files', fileCtrl.getByLead);
router.post('/:leadId/files', uploadLeadFile, fileCtrl.upload);
router.get('/files/:id/download', fileCtrl.download);
router.delete('/files/:id', fileCtrl.delete);

// Contacts
router.get('/:leadId/contacts', contactCtrl.getByLead);
router.post('/:leadId/contacts', [body('name').notEmpty()], validate, contactCtrl.create);
router.put('/contacts/:id', contactCtrl.update);
router.delete('/contacts/:id', contactCtrl.delete);

// Quotations
router.get('/:leadId/quotations', quotCtrl.getByLead);

// Invoices
router.get('/:leadId/invoices', invCtrl.getByLead);

module.exports = router;
