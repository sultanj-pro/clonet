const express = require('express');
const router = express.Router();
const cloneController = require('../controllers/cloneController');

// Test MySQL connection and list tables
router.post('/test-connection', cloneController.testConnection);

// Get schema for a specific table
router.post('/get-schema', cloneController.getSchema);

// Execute clone operation
router.post('/execute', cloneController.executeClone);

// Get status of a clone job
router.get('/status/:jobId', cloneController.getCloneStatus);

module.exports = router;
