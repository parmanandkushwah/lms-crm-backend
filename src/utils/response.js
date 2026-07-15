const success = (res, data = {}, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, ...data });

const created = (res, data = {}, message = 'Created successfully') =>
  success(res, data, message, 201);

const paginated = (res, rows, count, page, limit, message = 'Success') =>
  res.status(200).json({
    success: true,
    message,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit),
    },
  });

module.exports = { success, created, paginated };
