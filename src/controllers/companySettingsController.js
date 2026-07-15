const { Settings } = require('../models');
const { success } = require('../utils/response');

exports.getCompanySettings = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: 'company' },
      defaults: { category: 'company', data: {} },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.updateCompanySettings = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: 'company' },
      defaults: { category: 'company', data: req.body || {} },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'Company settings updated');
  } catch (err) { next(err); }
};
