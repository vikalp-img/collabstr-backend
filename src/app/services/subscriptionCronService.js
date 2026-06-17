const Subscription = require("../../models/subscriptionModel");
const Plan = require("../../models/planModel");
const subscriptionService = require("./subscriptionService");

exports.processDailySubscriptions = async () => {
  console.log(`[CRON - Subs] Starting daily subscription processing...`);
  const now = new Date();

  try {
    // 1. Find all active subscriptions that have expired
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lt: now },
    });

    for (const sub of expiredSubscriptions) {
      sub.status = "expired";
      await sub.save();
      console.log(`[CRON - Subs] Subscription ${sub._id} marked as expired for Brand ${sub.brandId}`);

      // Check if the brand has a pending subscription to activate
      // (This usually happens implicitly if start dates line up, but we'll also activate pending ones below).
      // However, we must explicitly check if NO pending or active plans exist, so we can fall back to the Free Plan.
      const hasFuturePlans = await Subscription.findOne({
        brandId: sub.brandId,
        status: "active",
      });

      if (!hasFuturePlans) {
        // Fallback to free plan
        const freePlan = await Plan.findOne({ name: "Basic", status: true });
        if (freePlan) {
          console.log(`[CRON - Subs] Brand ${sub.brandId} has no future plans. Auto-assigning Basic Plan.`);
          await subscriptionService.purchasePlan(sub.brandId, freePlan._id);
        } else {
          console.log(`[CRON - Subs] Warning: 'Basic' plan not found. Could not assign fallback plan to Brand ${sub.brandId}.`);
        }
      }
    }

    console.log(`[CRON - Subs] Daily subscription processing complete.`);
  } catch (error) {
    console.error(`[CRON - Subs] Error processing subscriptions:`, error);
  }
};
