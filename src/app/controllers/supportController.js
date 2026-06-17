const supportService = require("../services/supportService");

exports.submitRequest = async (req) => {
  return await supportService.submitRequest(req.body);
};
