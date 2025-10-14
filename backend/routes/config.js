const express = require('express');
const router = express.Router();
const storageConfig = require('../config/storage');
const { resetService } = require('../services/serviceManager');

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
 *                 enum: [mysql, parquet, delta]
 */
router.put('/storage', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['mysql', 'parquet', 'delta'].includes(type)) {
      return res.status(400).json({ error: 'Invalid storage type' });
    }

    console.log('Storage switch request:', {
      requestedType: type,
      currentType: storageConfig.type,
      body: req.body
    });
    
    let service;
    // Initialize the appropriate storage service first
    if (type === 'mysql') {
      const MySQLDataService = require('../services/mysqlDataService');
      service = new MySQLDataService();
    } else if (type === 'parquet') {
      console.log('Initializing Parquet service...');
      const ParquetDataService = require('../services/parquetDataService');
      service = new ParquetDataService();
    } else if (type === 'delta') {
      console.log('Initializing Delta Table Format service...');
      const DeltaTableDataService = require('../services/deltaTableDataService.simple');
      service = new DeltaTableDataService();
    }

    // Set a timeout for initialization
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Service initialization timed out')), 45000); // 45 seconds timeout
    });

    try {
      console.log(`Starting ${type} service initialization...`);
      
      // Race between initialization and timeout
      await Promise.race([
        service.initializeService(),
        timeoutPromise
      ]);
      
      console.log(`${type} service initialized successfully`);

      // Only update configuration after successful initialization
      process.env.STORAGE_TYPE = type;
      storageConfig.type = type;
      
      // Reset the service manager cache so next request gets the new service
      resetService();
      
      console.log('Storage configuration updated successfully');

      res.json({ 
        type: storageConfig.type,
        message: `Successfully switched to ${type} storage`
      });
    } catch (initError) {
      console.error('Detailed initialization error:', {
        message: initError.message,
        stack: initError.stack,
        type: type
      });
      
      if (initError.message === 'Service initialization timed out') {
        res.status(503).json({ 
          error: 'Service initialization is taking longer than expected',
          type: storageConfig.type // Return current storage type
        });
      } else {
        // Return more detailed error information
        res.status(500).json({
          error: 'Failed to initialize storage service',
          details: initError.message,
          type: storageConfig.type
        });
      }
    }
  } catch (error) {
    console.error('Error updating storage configuration:', error);
    res.status(500).json({ 
      error: 'Failed to update storage configuration',
      details: error.message 
    });
  }
});

module.exports = router;