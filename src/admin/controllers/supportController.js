const supportService = require("../services/supportService");

/**
 * Get all support requests
 */
exports.getAllRequests = async (req) => {
  return await supportService.getAllRequests(req.query);
};

/**
 * Get support request by ID
 */
exports.getRequestById = async (req) => {
  return await supportService.getRequestById(req.params.id);
};

/**
 * Update support request status
 */
exports.updateStatus = async (req) => {
  return await supportService.updateStatus(req.params.id, req.body);
};
