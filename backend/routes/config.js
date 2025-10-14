const express = require('express');
const router = express.Router();
const storageConfig = require('../config/storage');

/**
 * @swagger
 * /api/config/storage:
 *   get:
 *     tags: [Configuration]
 *     summary: Get current storage configuration
 *     description: Retrieve the current storage type configuration
 *     responses:
 *       200:
 *         description: Current storage configuration
 */
router.get('/storage', (req, res) => {
  res.json({ type: storageConfig.type });
});

/**
 * @swagger
 * /api/config/storage:
 *   put:
 *     tags: [Configuration]
 *     summary: Update storage configuration
 *     description: Update the storage type configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [mysql, parquet]
 */
router.put('/storage', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['mysql', 'parquet'].includes(type)) {
      return res.status(400).json({ error: 'Invalid storage type' });
    }

    // Update storage configuration
    process.env.STORAGE_TYPE = type;
    storageConfig.type = type;
    
    // Re-initialize services based on new storage type
    try {
      if (type === 'mysql') {
        const mysqlService = require('../services/mysqlDataService');
        await mysqlService.initialize();
      } else if (type === 'parquet') {
        const parquetService = require('../services/parquetDataService');
        // Add any initialization if needed for parquet service
      }
      res.json({ type });
    } catch (error) {
      console.error('Error initializing service:', error);
      res.status(500).json({ error: 'Failed to initialize new storage service' });
    }
  } catch (error) {
    console.error('Error updating storage configuration:', error);
    res.status(500).json({ error: 'Failed to update storage configuration' });
  }
});

module.exports = router;