const sequelize = require('../config/database');

const User             = require('./User');
const Lead             = require('./Lead');
const LeadActivity     = require('./LeadActivity');
const LeadAssignee     = require('./LeadAssignee');
const LeadFile         = require('./LeadFile');
const LeadStatusHistory = require('./LeadStatusHistory');
const Contact          = require('./Contact');
const Product          = require('./Product');
const Quotation        = require('./Quotation');
const QuotationItem    = require('./QuotationItem');
const Invoice          = require('./Invoice');
const InvoiceItem      = require('./InvoiceItem');
const Purchase         = require('./Purchase');
const PurchaseItem     = require('./PurchaseItem');
const Notification     = require('./Notification');
const AuditLog         = require('./AuditLog');
const Document         = require('./Document');
const Settings         = require('./Settings');

// ─── User associations ───────────────────────────────────────────────────────
User.hasMany(Lead, { foreignKey: 'assigned_to', as: 'assignedLeads' });
User.hasMany(Lead, { foreignKey: 'created_by',  as: 'createdLeads' });
User.hasMany(LeadActivity, { foreignKey: 'user_id', as: 'activities' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasMany(AuditLog,     { foreignKey: 'user_id', as: 'auditLogs' });

// ─── Lead associations ────────────────────────────────────────────────────────
Lead.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Lead.belongsTo(User, { foreignKey: 'created_by',  as: 'creator' });
Lead.belongsToMany(User, { through: LeadAssignee, foreignKey: 'lead_id', as: 'assignees' });
User.belongsToMany(Lead, { through: LeadAssignee, foreignKey: 'user_id', as: 'assignedToLeads' });
Lead.hasMany(LeadActivity,     { foreignKey: 'lead_id', as: 'activities',     onDelete: 'CASCADE' });
Lead.hasMany(LeadFile,         { foreignKey: 'lead_id', as: 'files',          onDelete: 'CASCADE' });
Lead.hasMany(LeadStatusHistory,{ foreignKey: 'lead_id', as: 'statusHistory',  onDelete: 'CASCADE' });
Lead.hasMany(Contact,          { foreignKey: 'lead_id', as: 'contacts',       onDelete: 'SET NULL' });
Lead.hasMany(Quotation,        { foreignKey: 'lead_id', as: 'quotations',     onDelete: 'CASCADE' });
Lead.hasMany(Invoice,          { foreignKey: 'lead_id', as: 'invoices',       onDelete: 'CASCADE' });

// ─── LeadActivity associations ────────────────────────────────────────────────
LeadActivity.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
LeadActivity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── LeadFile associations ────────────────────────────────────────────────────
LeadFile.belongsTo(Lead, { foreignKey: 'lead_id',    as: 'lead' });
LeadFile.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// ─── LeadStatusHistory associations ──────────────────────────────────────────
LeadStatusHistory.belongsTo(Lead, { foreignKey: 'lead_id',    as: 'lead' });
LeadStatusHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedBy' });

// ─── Contact associations ─────────────────────────────────────────────────────
Contact.belongsTo(Lead, { foreignKey: 'lead_id',    as: 'lead' });
Contact.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ─── Product associations ─────────────────────────────────────────────────────
Product.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Product.hasMany(QuotationItem, { foreignKey: 'product_id', as: 'quotationItems' });
Product.hasMany(InvoiceItem,   { foreignKey: 'product_id', as: 'invoiceItems' });
Product.hasMany(PurchaseItem,  { foreignKey: 'product_id', as: 'purchaseItems' });

// ─── Quotation associations ───────────────────────────────────────────────────
Quotation.belongsTo(Lead, { foreignKey: 'lead_id',    as: 'lead' });
Quotation.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Quotation.hasMany(QuotationItem, { foreignKey: 'quotation_id', as: 'items', onDelete: 'CASCADE' });
Quotation.hasMany(Invoice,       { foreignKey: 'quotation_id', as: 'invoices' });

// ─── QuotationItem associations ───────────────────────────────────────────────
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });
QuotationItem.belongsTo(Product,   { foreignKey: 'product_id',   as: 'product' });

// ─── Invoice associations ─────────────────────────────────────────────────────
Invoice.belongsTo(Lead,      { foreignKey: 'lead_id',      as: 'lead' });
Invoice.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });
Invoice.belongsTo(User,      { foreignKey: 'created_by',   as: 'creator' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id',   as: 'items', onDelete: 'CASCADE' });

// ─── InvoiceItem associations ─────────────────────────────────────────────────
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
InvoiceItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// ─── Purchase associations ───────────────────────────────────────────────────
Purchase.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items', onDelete: 'CASCADE' });

// ─── PurchaseItem associations ───────────────────────────────────────────────
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// ─── Notification associations ────────────────────────────────────────────────
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── AuditLog associations ────────────────────────────────────────────────────
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── Document associations ─────────────────────────────────────────────────────
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

module.exports = {
  sequelize,
  User,
  Lead,
  LeadActivity,
  LeadAssignee,
  LeadFile,
  LeadStatusHistory,
  Contact,
  Product,
  Quotation,
  QuotationItem,
  Invoice,
  InvoiceItem,
  Purchase,
  PurchaseItem,
  Notification,
  AuditLog,
  Document,
  Settings,
};
