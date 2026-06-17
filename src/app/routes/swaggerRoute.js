const swaggerUi = require("swagger-ui-express");
const appSwaggerSpec = require("../../swagger/app/userSwagger.json");

module.exports = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(appSwaggerSpec));
};
