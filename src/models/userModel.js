const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


// -------------------------------------------------------------//
let user_verify = new mongoose.Schema({
  pan_verify: {
    type: Number,
    default: -1,
  },
  aadhar_verify: {
    type: Number,
    default: -1,
  },
  bank_verify: {
    type: Number,
    default: -1,
  },
  email_verify: {
    type: Number,
    default: -1,
  },
  mobile_verify: {
    type: Number,
    default: -1,
  },
  created_at: {
    type: Date,
  },
  updated_at: {
    type: Date,
  },
});
// -------------------------------------------------------------//
let pancard = new mongoose.Schema({
  pan_name: {
    type: String,
  },
  pan_number: {
    type: String,
  },
  pan_dob: {
    type: String,
  },
  status: {
    type: Number,
  },
  comment: {
    type: String,
  },
  created_at: {
    type: Date,
  },
  updated_at: {
    type: Date,
  },
});

//--------------------------------------------------------------//
let aadharcard = new mongoose.Schema({
  aadhar_name: {
    type: String,
  },
  aadhar_number: {
    type: String,
  },
  state: {
    type: String,
  },
  aadhar_dob: {
    type: String,
  },
  dob: {
    type: String,
  },
  status: {
    type: Number,
  },
  comment: {
    type: String,
  },
  state: {
    type: String,
  },
  pincode: {
    type: String,
  },
  gender: {
    type: String,
  },
  city: {
    type: String,
  },
  address: {
    type: String,
  },
  created_at: {
    type: Date,
  },
  updated_at: {
    type: Date,
  },
  manualKyc: {
    type: Boolean,
    default: false,
  },
});

//--------------------------------------------------------------//
let bank = new mongoose.Schema({
  accountholder: {
    type: String,
  },
  accno: {
    type: String,
  },
  ifsc: {
    type: String,
  },
  bankname: {
    type: String,
  },
  bankbranch: {
    type: String,
  },
  state: {
    type: String,
  },
  status: {
    type: Number,
  },
  comment: {
    type: String,
  },
  type: {
    type: String,
  },
  mobile: {
    type: Number,
  },
  upi_id: {
    type: String,
  },
  gname: {
    type: String,
  },
  iagree: {
    type: String,
  },
  cashfree_status: {
    type: Number,
  },
  city: {
    type: String,
  },
  created_at: {
    type: Date,
  },
  updated_at: {
    type: Date,
  },
});
// -------------------------------------------------------------//
let bonusRefered = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  amount: {
    type: Number,
    default: 0,
  },
  txnid: {
    type: String,
  },
  created_at: {
    type: Date,
  },
  updated_at: {
    type: Date,
  },
});
// -------------------------------------------------------------//
const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    mobile: {
      type: Number,
    },
    isPhoneVerify: {
      type: Boolean,
      default: false,
    },
    countryCode: { type: String, default: "+91" },
    profile_image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
      provider: { type: String, default: "cloudinary" },
    },
    role: {
      type: String,
      enum: ["creator", "brand"],
      required: true,
    },
    password: {
      type: String,
      default: "",
    },
    refercode: {
      type: String,
      default: "",
    },
    otpExpiry: { type: Date },
    token: {
      type: String,
      default: "",
      trim: true,
    },
    fcmToken: {
      type: String,
      default: "",
      trim: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deactivateReason: {
      type: String,
      default: "",
      trim: true,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
    },
    isStatus: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: "",
    },
    loginStatus: {
      type: Boolean,
      default: false,
    },
    loginDate: {
      type: Date,
      default: null,
    },
    ip: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
      default: "",
    },
    user_verify: {
      type: user_verify,
      default: {},
    },
    pancard: {
      type: pancard,
      default: {},
    },
    aadharcard: {
      type: aadharcard,
      default: {},
    },
    bank: {
      type: bank,
      default: {},
    },
    bonusRefered: [bonusRefered],
    corporateGiftingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "corporateGifting",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("user", userSchema);

module.exports = User;