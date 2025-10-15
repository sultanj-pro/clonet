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
 *     description: Retrieve the current storage type and access method configuration
 *     responses:
 *       200:
 *         description: Current storage configuration
 */
router.get('/storage', (req, res) => {
  res.json({ 
    type: storageConfig.type,
    accessMethod: storageConfig.accessMethod,
    label: storageConfig.getLabel()
  });
});

/**
 * @swagger
 * /api/config/storage:
 *   put:
 *     tags: [Configuration]
 *     summary: Update storage configuration
 *     description: Update the storage type and/or data access method configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [mysql, parquet, delta]
 *               accessMethod:
 *                 type: string
 *                 enum: [direct, sparksession]
 */
router.put('/storage', async (req, res) => {
  try {
    const { type, accessMethod } = req.body;
    
    // Use current values if not provided
    const newType = type || storageConfig.type;
    const newAccessMethod = accessMethod || storageConfig.accessMethod;

    // Validate type
    if (!['mysql', 'parquet', 'delta'].includes(newType)) {
      return res.status(400).json({ error: `Invalid storage type: ${newType}` });
    }

    // Validate access method
    if (!['direct', 'sparksession'].includes(newAccessMethod)) {
      return res.status(400).json({ error: `Invalid access method: ${newAccessMethod}` });
    }

    console.log('Storage configuration switch request:', {
      from: `${storageConfig.type}-${storageConfig.accessMethod}`,
      to: `${newType}-${newAccessMethod}`
    });
    
    // Get the appropriate service class
    let ServiceClass;
    const serviceKey = `${newType}-${newAccessMethod}`;
    
    switch (serviceKey) {
      case 'mysql-direct':
        ServiceClass = require('../services/mysqlDataService');
        break;
      case 'mysql-sparksession':
        ServiceClass = require('../services/sparkMySQLDataService');
        break;
      case 'parquet-direct':
        ServiceClass = require('../services/parquetDataService');
        break;
      case 'parquet-sparksession':
        ServiceClass = require('../services/sparkParquetDataService');
        break;
      case 'delta-direct':
        ServiceClass = require('../services/deltaTableDataService.simple');
        break;
      case 'delta-sparksession':
        ServiceClass = require('../services/sparkDeltaDataService');
        break;
      default:
        return res.status(400).json({ error: `Unsupported configuration: ${serviceKey}` });
    }

    // Create and initialize the service
    const service = new ServiceClass();

    // Set a timeout for initialization
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Service initialization timed out')), 90000); // 90 seconds timeout for Spark
    });

    try {
      console.log(`Initializing service: ${serviceKey}...`);
      
      // Race between initialization and timeout
      await Promise.race([
        service.initializeService(),
        timeoutPromise
      ]);
      
      console.log(`Service ${serviceKey} initialized successfully`);

      // Only update configuration after successful initialization
      process.env.STORAGE_TYPE = newType;
      process.env.DATA_ACCESS_METHOD = newAccessMethod;
      storageConfig.type = newType;
      storageConfig.accessMethod = newAccessMethod;
      
      // Reset the service manager cache so next request gets the new service
      resetService();
      
      console.log('Storage configuration updated successfully');

      res.json({ 
        type: storageConfig.type,
        accessMethod: storageConfig.accessMethod,
        label: storageConfig.getLabel(),
        message: `Successfully switched to ${storageConfig.getLabel()}`
      });
    } catch (initError) {
      console.error('Detailed initialization error:', {
        message: initError.message,
        stack: initError.stack,
        type: newType,
        accessMethod: newAccessMethod
      });
      
      if (initError.message === 'Service initialization timed out') {
        res.status(503).json({ 
          error: 'Service initialization is taking longer than expected',
          type: storageConfig.type,
          accessMethod: storageConfig.accessMethod
        });
      } else {
        // Return more detailed error information
        res.status(500).json({
          error: 'Failed to initialize storage service',
          details: initError.message,
          type: storageConfig.type,
          accessMethod: storageConfig.accessMethod
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