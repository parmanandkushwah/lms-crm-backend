const { Notification } = require('../models');

const notify = async (userId, type, title, message, link = null, metadata = {}) => {
  try {
    return await Notification.create({ user_id: userId, type, title, message, link, metadata });
  } catch (_) {}
};

const notifyLeadAssigned = (userId, leadTitle, leadId) =>
  notify(userId, 'lead_assigned', 'Lead Assigned', `You have been assigned lead: ${leadTitle}`, `/leads/${leadId}`);

const notifyLeadUpdated = (userId, leadTitle, leadId) =>
  notify(userId, 'lead_updated', 'Lead Updated', `Lead "${leadTitle}" has been updated`, `/leads/${leadId}`);

const notifyQuotationViewed = (userId, quotationNumber, leadId) =>
  notify(userId, 'quotation_viewed', 'Quotation Viewed', `Quotation ${quotationNumber} was viewed by the client`, `/leads/${leadId}`);

const notifyInvoicePaid = (userId, invoiceNumber, leadId) =>
  notify(userId, 'invoice_paid', 'Invoice Paid', `Invoice ${invoiceNumber} has been marked as paid`, `/leads/${leadId}`);

const notifyTaskDue = (userId, taskTitle, leadId) =>
  notify(userId, 'task_due', 'Task Due', `Task "${taskTitle}" is due soon`, `/leads/${leadId}`);

module.exports = { notify, notifyLeadAssigned, notifyLeadUpdated, notifyQuotationViewed, notifyInvoicePaid, notifyTaskDue };
