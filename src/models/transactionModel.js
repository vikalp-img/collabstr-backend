const mongoose = require("mongoose");
const Schema = mongoose.Schema;
let transactionModel = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    amount: {
        type: Number,
        default: 0,
    },
    transactionId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "success", "failed"],
        required: true,
    },
    openingBalance: {
        type: Number,
        default: 0,
    },
    closingBalance: {
        type: Number,
        default: 0,
    },
    source: {
        type: String, 
        enum: ["user_investment", "service_purchase", "escrow_hold", "escrow_release", "escrow_refund", "platform_commission", "plan_purchase", "platform_withdrawal", "admin_deposit"],
        default: 'user_investment'
    }
}, { timestamps: true, versionKey: false });

const transaction = mongoose.model("transaction", transactionModel);

module.exports = transaction;