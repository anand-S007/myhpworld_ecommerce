const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Phone is now unique so OTP-based signup can't produce two accounts
    // against the same number. Stored with the country code stripped.
    phone:    { type: String, required: true, trim: true, unique: true, sparse: true },
    password: { type: String, required: true, minlength: 6 },
    // Super-admin editable label attached to the user. 'customer' is the
    // default for anyone who self-registers. Any other value is created
    // on-the-fly by a super-admin from the Users admin screen.
    role:     { type: String, default: 'customer', trim: true, lowercase: true },
    // Flipped to true once the user completes phone-OTP verification on
    // signup. Kept on the doc so future flows can gate features.
    mobileVerified: { type: Boolean, default: false },
    // Admin-controlled kill switch. When true the user can't sign in, and
    // existing JWTs are rejected by the auth middleware. Use for fraud /
    // abuse cases — set by admin UI, not by the user themselves.
    blocked: { type: Boolean, default: false },
    addresses: [
      {
        label:   String,
        line1:   String,
        line2:   String,
        city:    String,
        state:   String,
        pincode: String,
        country: { type: String, default: 'India' },
        isDefault: { type: Boolean, default: false },
      },
    ],
    // Products the user has hearted. Stored as ObjectId refs to the Product
    // collection so we can populate full product docs in one query. Using
    // $addToSet / $pull on writes keeps entries unique automatically.
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
