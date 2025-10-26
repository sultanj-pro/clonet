const express = require('express');
const router = express.Router();

const { ensureConnectionsTable } = require('../utils/dbSetup');
const connectionsController = require('../controllers/connectionsController');
const mssql = require('mssql');

const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Password123!',
  server: process.env.DB_HOST || 'sqlserver',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function ensureConnectionsTableMiddleware(req, res, next) {
  try {
    const pool = await mssql.connect(sqlConfig);
    await ensureConnectionsTable(pool);
    await pool.close();
    next();
  } catch (err) {
    console.error('Error ensuring connections table:', err);
    res.status(500).json({ error: 'Database error: could not ensure connections table.' });
  }
}

router.use(ensureConnectionsTableMiddleware);

router.get('/', connectionsController.getConnections);
router.post('/', connectionsController.addConnection);
router.put('/:id', connectionsController.updateConnection);
router.delete('/:id', connectionsController.deleteConnection);

module.exports = router;
