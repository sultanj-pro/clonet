const fetch = require('node-fetch');

const SPARK_SERVICE_URL = process.env.SPARK_SERVICE_URL || 'http://spark-service:8000';

/**
 * Test MySQL connection and list available tables
 */
const testConnection = async (req, res) => {
  try {
    const { host, port, database, username, password } = req.body;

    // Validate required fields
    if (!host || !port || !database || !username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: host, port, database, username'
      });
    }

    // Forward request to Spark service
    const response = await fetch(`${SPARK_SERVICE_URL}/clone/test-mysql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host, port, database, username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test connection'
    });
  }
};

/**
 * Get schema for a specific table
 */
const getSchema = async (req, res) => {
  try {
    const { host, port, database, username, password, table } = req.body;

    // Validate required fields
    if (!host || !port || !database || !username || !table) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: host, port, database, username, table'
      });
    }

    // Forward request to Spark service
    const response = await fetch(`${SPARK_SERVICE_URL}/clone/get-schema`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host, port, database, username, password, table }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error getting schema:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get schema'
    });
  }
};

/**
 * Execute clone operation from source to destination
 */
const executeClone = async (req, res) => {
  try {
    const { source, destination, options } = req.body;

    // Validate required fields
    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: source, destination'
      });
    }

    // Validate source fields
    if (!source.host || !source.port || !source.database || !source.username || !source.table) {
      return res.status(400).json({
        success: false,
        message: 'Missing required source fields: host, port, database, username, table'
      });
    }

    // Validate destination fields
    if (!destination.host || !destination.port || !destination.database || !destination.username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required destination fields: host, port, database, username'
      });
    }

    // Use source table name if destination table is not specified
    if (!destination.table) {
      destination.table = source.table;
    }

    console.log(`Starting clone operation: ${source.host}/${source.database}.${source.table} -> ${destination.host}/${destination.database}.${destination.table}`);

    // Forward request to Spark service
    const response = await fetch(`${SPARK_SERVICE_URL}/clone/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source, destination, options }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    console.log(`Clone operation completed: ${data.rowsCloned || 0} rows cloned in ${data.duration || 0}s`);

    res.json(data);
  } catch (error) {
    console.error('Error executing clone:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute clone operation'
    });
  }
};

/**
 * Get status of a clone job
 */
const getCloneStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: jobId'
      });
    }

    // Forward request to Spark service
    const response = await fetch(`${SPARK_SERVICE_URL}/clone/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error getting clone status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get clone status'
    });
  }
};

module.exports = {
  testConnection,
  getSchema,
  executeClone,
  getCloneStatus
};
