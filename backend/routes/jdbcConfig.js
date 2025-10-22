const express = require('express');
const router = express.Router();
const storageConfig = require('../config/storage');
const fs = require('fs');
const path = require('path');

const JDBC_CONFIG_PATH = path.join(__dirname, '../config/jdbc.json');

// GET current JDBC config
router.get('/', (req, res) => {
  let config = {};
  try {
    if (fs.existsSync(JDBC_CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(JDBC_CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read JDBC config', details: err.message });
  }
  res.json(config);
});

// PUT new JDBC config
router.put('/', (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !port || !user || !password || !database) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const config = { host, port, user, password, database };
  try {
    fs.writeFileSync(JDBC_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save JDBC config', details: err.message });
  }
  res.json({ message: 'JDBC config saved successfully!', config });
});

module.exports = router;
