const mongoose = require('mongoose');

const userModel = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: Number,
    },
    profile_image: {
        url: { type: String, default: '' },
        public_id: { type: String, default: '' },
        provider: { type: String, default: 'cloudinary' },
    },
    password: {
        type: String,
        default: ''
    },
    token: {
        type: String,
        default: '',
        trim: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    appKey: {
        type: String,
        default: ''
    },
    loginDate: {
        type: Date,
        default: null
    },
    loginStatus: {
        type: Boolean,
        default: false
    },
    permissions: {
        type: Object,
        default: {}
    }
}, { timestamps: true, versionKey: false });

const user = mongoose.model('admin', userModel);

module.exports = user;