const leadService = require("../services/leadService");


exports.subscribe = async (req) => {
  return await leadService.subscribe(req.body);
};

exports.unsubscribe = async (req) => {
  return await leadService.unsubscribe(req.body);
};
