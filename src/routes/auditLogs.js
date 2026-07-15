const router = require('express').Router()
const { AuditLog, User } = require('../models')
const { authenticate, authorize } = require('../middlewares/auth')
const { paginated } = require('../utils/response')
const { Op } = require('sequelize')

router.use(authenticate, authorize('admin', 'manager'))

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const where = {}
    if (search) where[Op.or] = [
      { action: { [Op.iLike]: `%${search}%` } },
      { entity: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ]
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    })
    paginated(res, rows, count, page, limit)
  } catch (err) { next(err) }
})

module.exports = router
