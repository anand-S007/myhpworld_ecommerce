const Newsletter = require('../models/Newsletter');

// POST /api/newsletter
async function subscribe(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const entry = await Newsletter.create({ email: email.toLowerCase() });
    res.status(201).json({ message: 'Subscribed', entry });
  } catch (err) {
    if (err.code === 11000) return res.status(200).json({ message: 'Already subscribed' });
    throw err;
  }
}

module.exports = { subscribe };
