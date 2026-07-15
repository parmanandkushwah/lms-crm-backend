const { Contact, Lead } = require('../models');
const { success, created } = require('../utils/response');

exports.getByLead = async (req, res, next) => {
  try {
    const contacts = await Contact.findAll({
      where: { lead_id: req.params.leadId },
      order: [['is_primary', 'DESC'], ['created_at', 'ASC']],
    });
    success(res, { data: contacts });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // If new contact is primary, unset others
    if (req.body.is_primary)
      await Contact.update({ is_primary: false }, { where: { lead_id: req.params.leadId } });

    const contact = await Contact.create({ ...req.body, lead_id: req.params.leadId, created_by: req.user.id });
    created(res, { data: contact }, 'Contact created');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    if (req.body.is_primary)
      await Contact.update({ is_primary: false }, { where: { lead_id: contact.lead_id } });

    await contact.update(req.body);
    success(res, { data: contact }, 'Contact updated');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    await contact.destroy();
    success(res, {}, 'Contact deleted');
  } catch (err) { next(err); }
};
