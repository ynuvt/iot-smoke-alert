const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');

// GET /api/alerts - Fetch all historical alert records
router.get('/', async (req, res) => {
  try {
    const alerts = await AlertLog.find();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alert logs', details: err.message });
  }
});

module.exports = router;
