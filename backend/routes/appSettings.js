// backend/routes/appSettings.js
const express = require('express');
const router = express.Router();

// This route returns the current JDBC storage/database in use
router.get('/current-jdbc', (req, res) => {
  res.json({
    currentJdbcDatabase: 'clonet_app_db'
  });
});

module.exports = router;
