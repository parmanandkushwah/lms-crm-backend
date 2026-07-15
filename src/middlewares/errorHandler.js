const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ success: false, message: messages[0], errors: messages });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });

module.exports = { errorHandler, notFound };
