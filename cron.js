const mongoose = require("mongoose");
const cron = require("cron");
require("dotenv").config();

const orderCronService = require("./src/app/services/orderCronService");
const subscriptionCronService = require("./src/app/services/subscriptionCronService");

// Connect to Database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("[CRON] Connected to Database Successfully.");

    // Define a cron job to run every hour (or adjust as needed)
    const job = new cron.CronJob("0 * * * *", async () => {
      console.log(`[CRON] Hourly Job triggered at ${new Date().toISOString()}`);
      await orderCronService.processAutoApprovals();
    });

    job.start();
    console.log("[CRON] Hourly order job scheduled.");

    // Define a cron job to run daily at midnight
    const midnightJob = new cron.CronJob("0 0 * * *", async () => {
      console.log(`[CRON] Midnight Job triggered at ${new Date().toISOString()}`);
      await subscriptionCronService.processDailySubscriptions();
    });

    midnightJob.start();
    console.log("[CRON] Midnight subscription job scheduled.");
    
    // Optionally run hourly job immediately on start
    orderCronService.processAutoApprovals();

  })
  .catch((err) => {
    console.error("[CRON] Failed to connect to Database", err);
    process.exit(1);
  });
