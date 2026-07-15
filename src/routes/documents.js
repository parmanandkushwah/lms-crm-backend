const router = require('express').Router();
const ctrl = require('../controllers/documentController');
const { authenticate } = require('../middlewares/auth');
const { uploadDocument } = require('../middlewares/upload');

// View is reachable cross-origin from an <iframe>; auth is verified inside the
// controller via the Authorization header OR a ?token= query param (browsers
// don't attach bearer tokens to iframe navigations).
router.get('/:id/view', ctrl.view);

router.use(authenticate);

router.get('/', ctrl.getAll);
router.post('/', uploadDocument, ctrl.upload);
router.get('/:id/download', ctrl.download);
router.delete('/:id', ctrl.remove);

module.exports = router;
