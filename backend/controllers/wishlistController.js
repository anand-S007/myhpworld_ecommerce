const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

// Utility — validate the incoming :productId and 404 early if missing.
async function productExists(id) {
  if (!mongoose.isValidObjectId(id)) return false;
  const count = await Product.countDocuments({ _id: id });
  return count > 0;
}

// GET /api/users/me/wishlist
// Returns the populated product documents so the frontend can render each
// card without a second fetch. We also expose the raw id list on `ids`
// which the storefront heart buttons use to decide their active state
// without needing to materialize the whole array.
async function list(req, res) {
  const user = await User.findById(req.user._id).populate('wishlist');
  const populated = (user?.wishlist || []).filter(Boolean);
  res.json({
    items: populated,
    ids:   populated.map((p) => p._id),
  });
}

// POST /api/users/me/wishlist/:productId
// Idempotent — re-adding a product is a no-op thanks to $addToSet.
async function add(req, res) {
  const { productId } = req.params;
  if (!(await productExists(productId))) {
    return res.status(404).json({ message: 'Product not found.' });
  }
  await User.updateOne(
    { _id: req.user._id },
    { $addToSet: { wishlist: productId } }
  );
  return list(req, res);
}

// DELETE /api/users/me/wishlist/:productId
// Also idempotent — removing something that isn't there succeeds quietly.
async function remove(req, res) {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ message: 'Invalid product id.' });
  }
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { wishlist: productId } }
  );
  return list(req, res);
}

module.exports = { list, add, remove };
