const mongoose = require('mongoose');

// Visit — one record per page view. The frontend fires a POST /api/visits
// on every route change with a client-generated `sessionId` (persisted in
// localStorage), which gives us stable "unique visitor" counts even when
// IPs change or users switch networks.
//
// A TTL index drops rows after 400 days so the collection self-prunes —
// the admin dashboard only queries up to 1 year back.
const visitSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    path:      { type: String, default: '/' },
    referrer:  { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip:        { type: String, default: '' },
    // If the visitor was logged in, keep the user ref so we can break
    // down "authenticated vs guest" later if needed.
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Auto-expire visits older than 400 days (well past the 1y filter limit).
visitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

module.exports = mongoose.model('Visit', visitSchema);
