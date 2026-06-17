const swaggerUi = require("swagger-ui-express");
const adminSwaggerSpec = require("../../swagger/admin/adminSwagger.json");

module.exports = (app) => {
  app.use("/admin-docs", swaggerUi.serve, swaggerUi.setup(adminSwaggerSpec));
};