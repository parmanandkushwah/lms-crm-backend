require('dotenv').config();
const { sequelize } = require('../models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // sync({ force: false, alter: true }) — creates tables if not exist, alters columns if changed
    await sequelize.sync({ alter: true });

    // PostgreSQL does not add new ENUM values with sync({ alter: true }).
    // Add the 'follow_up' value to the outcome ENUM if it doesn't exist yet.
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
      console.warn('  ⚠ Could not add follow_up to ENUM (may already exist):', e.message);
    }

    console.log('✅ All tables created/updated successfully');
    console.log('   Tables: users, leads, lead_activities, lead_files, lead_status_history,');
    console.log('           contacts, products, quotations, quotation_items,');
    console.log('           invoices, invoice_items, notifications, audit_logs');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrate();
