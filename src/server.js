require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { sequelize } = require('./models');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts' } }));
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || 100),
}));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/leads',         require('./routes/leads'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/quotations',    require('./routes/quotations'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/purchases',     require('./routes/purchases'));
app.use('/api/financial-reports', require('./routes/financialReports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/followups',     require('./routes/followups'));
app.use('/api/calendar',      require('./routes/calendar'));
app.use('/api/audit-logs',    require('./routes/auditLogs'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/non-gst-bills',  require('./routes/nonGstBills'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(async () => {
    logger.info('Database connected');
    // Sync models (creates/updates tables including join tables)
    await sequelize.sync({ alter: false });
    // Ensure the 'follow_up' ENUM value exists (PostgreSQL sync does not add new ENUM values).
    try {
      await sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'enum_lead_activities_outcome'
              AND e.enumlabel = 'follow_up'
          ) THEN
            ALTER TYPE "enum_lead_activities_outcome" ADD VALUE 'follow_up';
          END IF;
        END $$;`
      );
    } catch (e) {
      logger.warn('Could not add follow_up to ENUM:', e.message);
    }
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

module.exports = app;
