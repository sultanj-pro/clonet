const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');
const fetch = require('node-fetch');

const SPARK_SERVICE_URL = process.env.SPARK_SERVICE_URL || 'http://spark-service:8000';

// Get all connections
exports.getConnections = async (req, res) => {
  try {
    const pool = mysql.createPool(dbConfig);
    const [rows] = await pool.query('SELECT * FROM connections');
    await pool.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch connections', error: error.message });
  }
};

// Test a connection
exports.testConnection = async (req, res) => {
  try {
    const { type, host, port, database, username, password, instanceName } = req.body;

    // Validate required fields
    if (!host || !database || !username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: host, database, username'
      });
    }

    // Forward request to Spark service
    const response = await fetch(`${SPARK_SERVICE_URL}/clone/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, host, port, database, username, password, instanceName }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Log the full error for debugging
      console.error('Connection test failed:', data);
      
      // Extract user-friendly error message
      let userMessage = 'Connection failed';
      if (data.message) {
        const errorMsg = data.message;
        if (errorMsg.includes('Access denied')) {
          userMessage = 'Access denied - please check username and password';
        } else if (errorMsg.includes('Communications link failure') || errorMsg.includes('Connection refused')) {
          userMessage = 'Cannot reach database server - please check host and port';
        } else if (errorMsg.includes('Unknown database')) {
          userMessage = 'Database does not exist';
        } else if (errorMsg.includes('java.sql.SQLException:')) {
          const match = errorMsg.match(/java\.sql\.SQLException:\s*([^\n]+)/);
          userMessage = match ? match[1].trim() : 'Connection failed';
        } else {
          const firstLine = errorMsg.split('\n')[0];
          userMessage = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
        }
      }
      
      return res.status(response.status).json({
        success: false,
        message: userMessage
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection - please check your connection settings'
    });
  }
};

// Add a new connection
exports.addConnection = async (req, res) => {
  const { name, host, port, username, password, database, type } = req.body;
  try {
    const pool = mysql.createPool(dbConfig);
    const [result] = await pool.query(
        'INSERT INTO connections (name, host, port, username, password, db_name, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, host, port, username, password, database, type]
    );
    await pool.end();
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add connection', error: error.message });
  }
};

// Update a connection
exports.updateConnection = async (req, res) => {
  const { id } = req.params;
  const { name, host, port, username, password, database, type } = req.body;
  try {
    const pool = mysql.createPool(dbConfig);
    await pool.query(
        'UPDATE connections SET name=?, host=?, port=?, username=?, password=?, db_name=?, type=? WHERE id=?',
      [name, host, port, username, password, database, type, id]
    );
    await pool.end();
    res.json({ message: 'Connection updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update connection', error: error.message });
  }
};

// Delete a connection
exports.deleteConnection = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = mysql.createPool(dbConfig);
    await pool.query('DELETE FROM connections WHERE id=?', [id]);
    await pool.end();
    res.json({ message: 'Connection deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete connection', error: error.message });
  }
};
// Get tables for a connection
exports.getTables = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = mysql.createPool(dbConfig);
    const [rows] = await pool.query('SELECT * FROM connections WHERE id=?', [id]);
    await pool.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const connection = rows[0];
    
    // Forward request to Spark service to get tables
    const response = await fetch(`${SPARK_SERVICE_URL}/clone/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: connection.type.toLowerCase().replace(/\s+/g, ''),
        host: connection.host,
        port: connection.port,
        database: connection.db_name,
        username: connection.username,
        password: connection.password,
        instanceName: connection.instance_name
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Failed to fetch tables'
      });
    }

    res.json({ tables: data.tables || [] });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Failed to fetch tables', error: error.message });
  }
};