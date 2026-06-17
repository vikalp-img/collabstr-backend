const mongoose = require("mongoose");
const Schema = mongoose.Schema;


let walletModel = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    balance: {
        type: Number,
        default: 0,
    }
}, { timestamps: true, optimisticConcurrency: true });

const wallet = mongoose.model("wallet", walletModel);

module.exports = wallet;