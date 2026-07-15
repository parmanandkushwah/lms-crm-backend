require('dotenv').config();
const { sequelize } = require('../models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // sync({ force: false, alter: true }) — creates tables if not exist, alters columns if changed
    await sequelize.sync({ alter: true });

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
