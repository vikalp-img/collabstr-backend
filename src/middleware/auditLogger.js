const logger = require("../config/logger.config");

const auditLogger = (req, res, next) => {
  const start = Date.now();
  console.log("auditLogger", req.method, req.originalUrl);
  res.on("finish", () => {
    const duration = Date.now() - start;

    // Identify if it's an Admin or User based on your models
    const actor = req.admin || req.user || null;
    const type = req.admin ? "Admin" : req.user ? "User" : "Guest";

    const logData = {
      name: actor?.name || actor?.userName || "Guest",
      email: actor?.email || "N/A",
      phone: actor?.phone || actor?.mobile || "N/A",
      userId: actor?._id || null,
      role: type,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${duration}ms`,
      ip: req.ip,
      // Filter sensitive body data
      body:
        req.method === "POST"
          ? { ...req.body, password: "***", pin: "***" }
          : {},
    };

    logger.info(`API Hit: ${req.method} ${req.originalUrl}`, logData);
  });

  next();
};

module.exports = auditLogger;
