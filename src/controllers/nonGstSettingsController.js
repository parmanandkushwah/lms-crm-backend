const { Settings } = require('../models');
const { success } = require('../utils/response');

exports.getNonGstSettings = async (req, res, next) => {
  try {
    const [row] = await Settings.findOrCreate({
      where: { category: 'non_gst' },
      defaults: { category: 'non_gst', data: {} },
    });
    success(res, { data: row.data });
  } catch (err) { next(err); }
};

exports.updateNonGstSettings = async (req, res, next) => {
  try {
    const [row, created] = await Settings.findOrCreate({
      where: { category: 'non_gst' },
      defaults: { category: 'non_gst', data: req.body || {} },
    });
    if (!created) await row.update({ data: req.body || {} });
    success(res, { data: row.data }, 'Non-GST settings updated');
  } catch (err) { next(err); }
};
