const { Settings } = require('../models');
const { success } = require('../utils/response');

exports.getByCategory = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: req.params.category },
      defaults: { category: req.params.category, data: {} },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.upsert = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: req.params.category },
      defaults: { category: req.params.category, data: req.body || {} },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'Settings updated');
  } catch (err) { next(err); }
};
