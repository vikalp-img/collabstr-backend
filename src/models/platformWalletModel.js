const mongoose = require("mongoose");

const platformWalletSchema = new mongoose.Schema(
  {
    // Platform fee balance (collected 20% commissions, available)
    balance: {
      type: Number,
      default: 0,
    },
    // Cumulative total of all platform fees ever earned
    totalEarned: {
      type: Number,
      default: 0,
    },
    // Total escrow funds currently in "holding" state across all orders
    escrowHeld: {
      type: Number,
      default: 0,
    },
    // Cumulative total of all escrow ever processed (released + refunded)
    totalEscrowProcessed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, versionKey: false }
);

const PlatformWallet = mongoose.model("platformWallet", platformWalletSchema);

module.exports = PlatformWallet;
