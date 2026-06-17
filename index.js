const express = require("express");
const cors = require("cors");
const path = require("path");
const auditLogger = require("./src/middleware/auditLogger");
const app = express();
require("dotenv").config();
const devConfig = require("./src/config/dev.config");
require("./src/config/db.config");
global.c = console.log.bind(console);
app.set("trust proxy", 1);
// app.use(cors({ origin: true }));
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3738",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://138.68.68.183:3010",
  "http://138.68.68.183",
  "http://46.101.212.110",
  "http://46.101.212.110:3000",
  "http://46.101.212.110:7001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
  }),
);

app.use((req, res, next) => {
  const ua = req.get("user-agent") || "";
  console.log("ua", ua);
  if (!ua || ua.length < 10) {
    return res.status(403).json({ message: "Bot blocked" });
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));

app.use((req, res, next) => {
  console.log(req.ip, req.protocol);
  console.log(
    req.method,
    req.protocol + "://" + req.get("host") + req.originalUrl,
  );
  req.date = new Date();
  next();
});

app.use(auditLogger);
require("./src/app/routes")(app);
require("./src/admin/routes")(app);

const PORT = devConfig.PORT || 5005;

const cron = require("cron");
const orderCronService = require("./src/app/services/orderCronService");

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);

  // Schedule the cron job to run every hour
  const job = new cron.CronJob("0 * * * *", async () => {
    console.log(`[CRON] Job triggered at ${new Date().toISOString()}`);
    await orderCronService.processAutoApprovals();
  });

  job.start();
  console.log("[CRON] Job scheduled (running every hour) within main server.");

  // Optionally run it immediately on start
  orderCronService.processAutoApprovals();
});
