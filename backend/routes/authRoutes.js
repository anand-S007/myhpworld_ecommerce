const express = require('express');
const { unifiedLogin, resetPassword } = require('../controllers/authController');
const { sendOtp, verifyOtp } = require('../controllers/otpController');

const router = express.Router();

router.post('/login', unifiedLogin);

// OTP endpoints — used by signup + forgot-password flows.
router.post('/otp/send',   sendOtp);
router.post('/otp/verify', verifyOtp);

// Forgot password. Shares the OTP infrastructure via purpose='forgot-password'.
router.post('/password/reset', resetPassword);

module.exports = router;
