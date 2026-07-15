const { AuditLog } = require('../models');

const audit = async (req, action, entity, entityId, oldValues = null, newValues = null, description = '') => {
  try {
    await AuditLog.create({
      user_id: req.user?.id || null,
      action,
      entity,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      description,
    });
  } catch (_) {
    // audit failures should never break the main flow
  }
};

module.exports = audit;
