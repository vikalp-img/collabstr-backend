const orderModel = require("../../models/orderModel");
const orderService = require("./orderService");

/**
 * Process auto-approvals for orders that have been in "reviewing" status 
 * for 3 days or more.
 */
exports.processAutoApprovals = async () => {
  try {
    console.log("[CRON] Starting processAutoApprovals...");

    // 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const ordersToApprove = await orderModel.find({
      "items": {
        $elemMatch: {
          status: "reviewing",
          deliveredAt: { $lte: threeDaysAgo },
        }
      }
    });

    let processedCount = 0;

    for (const order of ordersToApprove) {
      for (const item of order.items) {
        if (item.status === "reviewing" && item.deliveredAt && item.deliveredAt <= threeDaysAgo) {
          try {
            console.log(`[CRON] Auto-approving order ${order.orderId}, item ${item._id}`);
            // Fake a call from the brand to approve
            await orderService.reviewDelivery(
              order._id,
              item._id,
              order.brandId,
              "completed",
              "Automatically completed after 3 days of delivery without response."
            );
            processedCount++;
          } catch (itemErr) {
            console.error(`[CRON] Failed to auto-approve order ${order.orderId}, item ${item._id}:`, itemErr.message);
          }
        }
      }
    }

    console.log(`[CRON] Finished processAutoApprovals. Processed: ${processedCount} items.`);
  } catch (error) {
    console.error(`[CRON] Error in processAutoApprovals:`, error.message);
  }
};
