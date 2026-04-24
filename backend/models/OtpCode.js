const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// OtpCode — one-time password for phone verification, password reset, etc.
// The plaintext code is never stored; we keep a bcrypt hash and a TTL so
// Mongo auto-expires the document. `purpose` lets the same identifier have
// independent codes for signup vs forgot-password without collision.
const otpSchema = new mongoose.Schema(
  {
    identifier:  { type: String, required: true, index: true }, // phone or email
    channel:     { type: String, enum: ['phone', 'email'], required: true },
    purpose:     { type: String, enum: ['signup', 'forgot-password'], required: true },
    codeHash:    { type: String, required: true },
    expiresAt:   { type: Date, required: true, index: { expires: 0 } }, // TTL index
    attempts:    { type: Number, default: 0 },
    verifiedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

otpSchema.methods.matchCode = function (entered) {
  return bcrypt.compare(String(entered), this.codeHash);
};

otpSchema.statics.hashCode = async function (code) {
  return bcrypt.hash(String(code), 10);
};

module.exports = mongoose.model('OtpCode', otpSchema);
