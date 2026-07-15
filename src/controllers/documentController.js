const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Document, User } = require('../models');
const { success, created } = require('../utils/response');

const authenticateFromRequest = async (req) => {
  if (req.user) return req.user;
  const token = req.query.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findByPk(decoded.id);
  } catch {
    return null;
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.category) where.category = req.query.category;

    const docs = await Document.findAll({
      where,
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    success(res, { data: docs });
  } catch (err) { next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const category = req.body.category || 'document';

    const doc = await Document.create({
      title: req.body.title || req.file.originalname,
      original_name: req.file.originalname,
      file_name: req.file.filename,
      file_path: `/uploads/documents/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      category,
      description: req.body.description,
      uploaded_by: req.user.id,
    });

    const created2 = await Document.findByPk(doc.id, {
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name'] }],
    });
    created(res, { data: created2 }, 'Document uploaded');
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const filePath = path.join(__dirname, '..', '..', doc.file_path);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    res.download(filePath, doc.original_name);
  } catch (err) { next(err); }
};

exports.view = async (req, res, next) => {
  try {
    const user = await authenticateFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const filePath = path.join(__dirname, '..', '..', doc.file_path);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'File not found on disk' });

    // Allow the frontend origin to embed this file in an <iframe> (helmet sets
    // X-Frame-Options: SAMEORIGIN and a CSP frame-ancestors 'self' by default,
    // which block cross-origin framing between the dev servers).
    const refOrigin = req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
      process.env.FRONTEND_URL || '*';
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${refOrigin}`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
    res.sendFile(filePath);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const isOwner = doc.uploaded_by === req.user.id;
    const isPrivileged = ['admin', 'manager'].includes(req.user.role);
    if (!isOwner && !isPrivileged)
      return res.status(403).json({ success: false, message: 'Access denied' });

    const filePath = path.join(__dirname, '..', '..', doc.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await doc.destroy();
    success(res, {}, 'Document deleted');
  } catch (err) { next(err); }
};
