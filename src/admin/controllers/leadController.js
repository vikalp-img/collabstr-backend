const leadService = require("../services/leadService");

/**
 * Get all leads for admin
 */
exports.getAllLeads = async (req) => {
  return await leadService.getAllLeads(req.query);
};

/**
 * Get lead details by ID
 */
exports.getLeadById = async (req) => {
  return await leadService.getLeadById(req.params.id);
};

/**
 * Update lead (status, source)
 */
exports.updateLead = async (req) => {
  return await leadService.updateLead(req.params.id, req.body);
};

/**
 * Delete lead
 */
exports.deleteLead = async (req) => {
  return await leadService.deleteLead(req.params.id);
};
