const winston = require("winston");
require("winston-mongodb");
require("dotenv").config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.MongoDB({
      db: process.env.DB_URL, // Use your db.config URL
      collection: "api_logs",
      options: { useUnifiedTopology: true },
      // Capped Collection logic
      capped: true,
      cappedSize: 104857600, // 100MB
      cappedMax: 50000, // Max 50k entries
      // Batching for high frequency (10-15 hits/20s)
      batch: true,
      batchSize: 20,
      batchInterval: 5000,
      leaveConnectionOpen: true,
    }),
  ],
});

module.exports = logger;
