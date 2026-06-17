const { apiV1Prefix } = require("../../config/default.json");

module.exports = (app) => {
  require("./swaggerRoute")(app);
  app.use(`${apiV1Prefix}/user`, require("./userRoutes"));
  app.use(`${apiV1Prefix}/category`, require("./categoryRoutes"));
  app.use(`${apiV1Prefix}/platform`, require("./platformRoutes"));
  app.use(`${apiV1Prefix}/services`, require("./serviceRoutes"));
  app.use(`${apiV1Prefix}/social-accounts`, require("./socialAccountRoutes"));
  app.use(`${apiV1Prefix}/testimonial`, require("./testimonialRoutes"));
  app.use(`${apiV1Prefix}/cms`, require("./cmsRoutes"));
  app.use(`${apiV1Prefix}/blogs`, require("./blogRoutes"));
  app.use(`${apiV1Prefix}/wallet`, require("./walletRoutes"));
  app.use(`${apiV1Prefix}/cart`, require("./cartRoutes"));
  app.use(`${apiV1Prefix}/order`, require("./orderRoutes"));
  app.use(`${apiV1Prefix}/favorites`, require("./favoriteRoutes"));
  app.use(`${apiV1Prefix}/transactions`, require("./transactionRoutes"));
  app.use(`${apiV1Prefix}/reviews`, require("./reviewRoutes"));
  app.use(`${apiV1Prefix}/plans`, require("./planRoutes"));
  app.use(`${apiV1Prefix}/subscription`, require("./subscriptionRoutes"));
  app.use(`${apiV1Prefix}/support`, require("./supportRoutes"));
  app.use(`${apiV1Prefix}/leads`, require("./leadRoutes"));
  app.use(`${apiV1Prefix}/footer-links`, require("./footerLinkRoutes"));
};