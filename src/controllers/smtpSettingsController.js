const { Settings } = require('../models');
const { success } = require('../utils/response');

exports.getSMTPSettings = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: 'smtp' },
      defaults: { category: 'smtp', data: { host: '', port: '', username: '', password: '', fromName: '', fromEmail: '', secure: false } },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.updateSMTPSettings = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: 'smtp' },
      defaults: { category: 'smtp', data: req.body || {} },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'SMTP settings updated');
  } catch (err) { next(err); }
};
