const { Settings } = require('../models');
const { success } = require('../utils/response');

exports.getAppearanceSettings = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: 'appearance' },
      defaults: { category: 'appearance', data: { theme: 'dark' } },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.updateAppearanceSettings = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: 'appearance' },
      defaults: { category: 'appearance', data: { theme: req.body?.theme || 'dark' } },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'Appearance settings updated');
  } catch (err) { next(err); }
};
