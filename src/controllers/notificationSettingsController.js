const { Settings } = require('../models');
const { success } = require('../utils/response');

const DEFAULTS = {
  newLead: true,
  dealWon: true,
  taskDue: true,
  followUp: true,
  emailDigest: false,
  weeklyReport: true,
  teamActivity: false,
};

exports.getNotificationSettings = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: 'notifications' },
      defaults: { category: 'notifications', data: DEFAULTS },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: 'notifications' },
      defaults: { category: 'notifications', data: { ...DEFAULTS, ...req.body } },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'Notification settings updated');
  } catch (err) { next(err); }
};
