const dashboardService = require("../services/dashboardService");


exports.getDashboardStats = async (req, res) => {
    try {
        const result = await dashboardService.getStats();
        return res.status(result.statusCode).send(result);
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message,
        });
    }
};