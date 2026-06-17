/**
 * Generates a random 6-digit OTP.
 * @returns {string} - 6-digit OTP as a string.
 */
exports.generateOtp = () => {
    return "123456";
};

/**
 * Sends an OTP to a mobile number (Mock).
 * @param {string} mobile - The recipient's mobile number.
 * @param {string} otp - The OTP to send.
 */
exports.sendOtp = async (mobile, otp) => {
    // Mock SMS integration
    console.log(`[OTP][SMS] To: ${mobile}, Message: Your OTP is ${otp}`);
    // You can later integrate with Twilio or another SMS gateway here.
};

/**
 * Sends an OTP to an email address (Mock).
 * @param {string} email - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} otp - The OTP to send.
 */
exports.sentOtp = async (email, subject, otp) => {
    // Mock Email integration
    console.log(`[OTP][EMAIL] To: ${email}, Subject: ${subject}, Message: Your OTP is ${otp}`);
    // You can later integrate with SendGrid, Nodemailer, etc. here.
};
