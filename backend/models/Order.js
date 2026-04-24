const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:     { type: String, required: true },
    price:    { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: String,
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name:    String,
    phone:   String,
    line1:   String,
    line2:   String,
    city:    String,
    state:   String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items:           { type: [orderItemSchema], required: true },
    shippingAddress: shippingAddressSchema,
    paymentMethod:   { type: String, default: 'cod' },
    itemsPrice:      { type: Number, required: true, min: 0 },
    shippingPrice:   { type: Number, default: 0, min: 0 },
    taxPrice:        { type: Number, default: 0, min: 0 },
    totalPrice:      { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    isPaid:          { type: Boolean, default: false },
    paidAt:          Date,
    isDelivered:     { type: Boolean, default: false },
    deliveredAt:     Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
