const { adminV1Prefix } = require("../../config/default.json");

module.exports = (app) => {
  require("./swaggerRoute")(app);
  app.use(`${adminV1Prefix}/users`, require('./userRoutes'));
  app.use(`${adminV1Prefix}/categories`, require('./categoryRoutes'));
  app.use(`${adminV1Prefix}/platforms`, require('./platformRoutes'));
  app.use(`${adminV1Prefix}/service-types`, require('./serviceTypeRoutes'));
  app.use(`${adminV1Prefix}/creators`, require('./creatorRoutes'));
  app.use(`${adminV1Prefix}/testimonial`, require('./testimonialRoutes'));
  app.use(`${adminV1Prefix}/cms`, require('./cmsRoutes'));
  app.use(`${adminV1Prefix}/blogs`, require('./blogRoutes'));
  app.use(`${adminV1Prefix}/services`, require('./serviceRoutes'));
  app.use(`${adminV1Prefix}/kyc`, require('./kycRoutes'));
  app.use(`${adminV1Prefix}/brands`, require('./brandRoutes'));
  app.use(`${adminV1Prefix}/orders`, require('./orderRoutes'));
  app.use(`${adminV1Prefix}/disputes`, require('./disputeRoutes'));
  app.use(`${adminV1Prefix}/transactions`, require('./transactionRoutes'));
  app.use(`${adminV1Prefix}/features`, require('./featureRoutes'));
  app.use(`${adminV1Prefix}/plans`, require('./planRoutes'));
  app.use(`${adminV1Prefix}/subscriptions`, require('./subscriptionRoutes'));
  app.use(`${adminV1Prefix}/dashboard`, require('./dashboardRoutes'));
  app.use(`${adminV1Prefix}/platform-wallet`, require("./platformWalletRoutes"));
  app.use(`${adminV1Prefix}/support`, require("./supportRoutes"));
  app.use(`${adminV1Prefix}/leads`, require("./leadRoutes"));
  app.use(`${adminV1Prefix}/footer-links`, require("./footerLinkRoutes"));
};
