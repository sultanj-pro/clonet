const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');
const connectionsController = require('../controllers/connectionsController');

async function ensureConnectionsTableMiddleware(req, res, next) {
  try {
    const pool = mysql.createPool(dbConfig);
    
    // Create connections table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        db_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await pool.end();
    next();
  } catch (err) {
    console.error('Error ensuring connections table:', err);
    res.status(500).json({ error: 'Database error: could not ensure connections table.' });
  }
}

router.use(ensureConnectionsTableMiddleware);

/**
 * @swagger
 * /api/connections:
 *   get:
 *     tags: [Connections]
 *     summary: Get all connections
 *     responses:
 *       200:
 *         description: List of all connections
 */
router.get('/', connectionsController.getConnections);

/**
 * @swagger
 * /api/connections/test:
 *   post:
 *     tags: [Connections]
 *     summary: Test a database connection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [host, database, username]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [mysql, sqlserver]
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               database:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               instanceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connection test result
 */
router.post('/test', connectionsController.testConnection);

/**
 * @swagger
 * /api/connections/{id}/test:
 *   post:
 *     tags: [Connections]
 *     summary: Test a saved connection by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Connection test result
 */
router.post('/:id/test', connectionsController.testConnectionById);

/**
 * @swagger
 * /api/connections:
 *   post:
 *     tags: [Connections]
 *     summary: Add a new connection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, host, port, username, password, database, type]
 *             properties:
 *               name:
 *                 type: string
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               database:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Connection created
 */
router.post('/', connectionsController.addConnection);

/**
 * @swagger
 * /api/connections/{id}:
 *   put:
 *     tags: [Connections]
 *     summary: Update a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Connection updated
 */
router.put('/:id', connectionsController.updateConnection);

/**
 * @swagger
 * /api/connections/{id}:
 *   delete:
 *     tags: [Connections]
 *     summary: Delete a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Connection deleted
 */
router.delete('/:id', connectionsController.deleteConnection);

/**
 * @swagger
 * /api/connections/{id}/tables:
 *   get:
 *     tags: [Connections]
 *     summary: Get tables for a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tables
 */
router.get('/:id/tables', connectionsController.getTables);

module.exports = router;