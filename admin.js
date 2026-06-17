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
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3738",
  "http://localhost:5173",
  "http://138.68.68.183:3010",
  "http://127.0.0.1:5173",
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));
app.use((req, res, next) => {
  req.date = new Date();
  next();
});
app.use(auditLogger);
/* version V1 Routes */
// require('./src/app/routes')(app);
require("./src/admin/routes")(app);

// set port, listen for requests
const PORT = devConfig.ADMINPORT || 3132;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
