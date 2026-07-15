const { Settings } = require('../models');
const { success } = require('../utils/response');

exports.getSecuritySettings = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: 'security' },
      defaults: { category: 'security', data: { twoFactorEnabled: false } },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.updateSecuritySettings = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: 'security' },
      defaults: { category: 'security', data: { twoFactorEnabled: false, ...req.body } },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'Security settings updated');
  } catch (err) { next(err); }
};
