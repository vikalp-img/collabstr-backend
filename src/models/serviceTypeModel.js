const mongoose = require("mongoose");

const serviceMasterSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        platform: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "platform",
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const ServiceMaster = mongoose.model("serviceMaster", serviceMasterSchema);

module.exports = ServiceMaster;