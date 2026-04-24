const Visit = require('../models/Visit');

// Range → { how far back, aggregation bucket unit + size }. Picked so each
// filter renders ~12–30 bars on the chart — readable without being noisy.
const RANGES = {
  '1h': { msBack: 60 * 60 * 1000,              unit: 'minute', binSize: 5 },
  '1d': { msBack: 24 * 60 * 60 * 1000,         unit: 'hour',   binSize: 1 },
  '1m': { msBack: 30 * 24 * 60 * 60 * 1000,    unit: 'day',    binSize: 1 },
  '1y': { msBack: 365 * 24 * 60 * 60 * 1000,   unit: 'month',  binSize: 1 },
};

// POST /api/visits
// Public endpoint — any page load posts here. The client provides a
// sessionId (persisted in localStorage); falls back to a random ID the
// server logs if the body is malformed.
async function trackVisit(req, res) {
  const { sessionId, path, referrer } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'sessionId is required.' });
  }
  // Minimise stored PII: keep only what's useful for an admin dashboard.
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  const userAgent = (req.headers['user-agent'] || '').slice(0, 300);
  await Visit.create({
    sessionId: sessionId.slice(0, 64),
    path:      (path || '/').slice(0, 300),
    referrer:  (referrer || '').slice(0, 300),
    userAgent,
    ip,
  });
  res.status(201).json({ ok: true });
}

// GET /api/admin/analytics/visits?range=1h|1d|1m|1y
// Returns aggregated visitor metrics for the admin dashboard.
async function getVisitStats(req, res) {
  const range = String(req.query.range || '1d');
  const cfg   = RANGES[range] || RANGES['1d'];
  const since = new Date(Date.now() - cfg.msBack);

  // Single aggregation that returns:
  //   totals  — [{ total, unique }] over the whole range
  //   buckets — one row per time bin with total + unique
  const [result] = await Visit.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total:  { $sum: 1 },
              unique: { $addToSet: '$sessionId' },
            },
          },
          { $project: { _id: 0, total: 1, unique: { $size: '$unique' } } },
        ],
        buckets: [
          {
            $group: {
              _id: {
                $dateTrunc: {
                  date: '$createdAt',
                  unit: cfg.unit,
                  binSize: cfg.binSize,
                },
              },
              total:  { $sum: 1 },
              unique: { $addToSet: '$sessionId' },
            },
          },
          {
            $project: {
              _id: 0,
              time:   '$_id',
              total:  1,
              unique: { $size: '$unique' },
            },
          },
          { $sort: { time: 1 } },
        ],
      },
    },
  ]);

  const totals = result?.totals?.[0] || { total: 0, unique: 0 };
  res.json({
    range,
    since,
    total:   totals.total,
    unique:  totals.unique,
    buckets: result?.buckets || [],
  });
}

module.exports = { trackVisit, getVisitStats, RANGES };
