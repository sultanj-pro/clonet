const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

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

// Add a new connection
exports.addConnection = async (req, res) => {
  const { name, host, port, user, password, database, type } = req.body;
  try {
    const pool = mysql.createPool(dbConfig);
    const [result] = await pool.query(
      'INSERT INTO connections (name, host, port, user, password, db_name, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, host, port, user, password, database, type]
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
  const { name, host, port, user, password, database, type } = req.body;
  try {
    const pool = mysql.createPool(dbConfig);
    await pool.query(
      'UPDATE connections SET name=?, host=?, port=?, user=?, password=?, db_name=?, type=? WHERE id=?',
      [name, host, port, user, password, database, type, id]
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
