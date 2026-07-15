const path = require('path');
const fs = require('fs');
const { LeadFile, Lead } = require('../models');
const { success, created } = require('../utils/response');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const lead = await Lead.findByPk(req.params.leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const file = await LeadFile.create({
      lead_id: req.params.leadId,
      uploaded_by: req.user.id,
      original_name: req.file.originalname,
      file_name: req.file.filename,
      file_path: `/uploads/lead-files/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      category: req.body.category || 'document',
      description: req.body.description,
    });
    created(res, { data: file }, 'File uploaded');
  } catch (err) { next(err); }
};

exports.getByLead = async (req, res, next) => {
  try {
    const files = await LeadFile.findAll({
      where: { lead_id: req.params.leadId },
      order: [['created_at', 'DESC']],
    });
    success(res, { data: files });
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    const file = await LeadFile.findByPk(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    const filePath = path.join(__dirname, '..', '..', file.file_path);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    res.download(filePath, file.original_name);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const file = await LeadFile.findByPk(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    const filePath = path.join(__dirname, '..', '..', file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await file.destroy();
    success(res, {}, 'File deleted');
  } catch (err) { next(err); }
};
