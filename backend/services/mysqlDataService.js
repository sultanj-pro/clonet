const mysql = require('mysql2/promise');
const config = require('../config/database');

let pool;

const initialize = async () => {
  try {
    pool = mysql.createPool(config);
    console.log('MySQL connection pool initialized');
  } catch (error) {
    console.error('Error initializing MySQL connection pool:', error);
    throw error;
  }
};

const getUsers = async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
  } catch (error) {
    console.error('Error fetching users from MySQL:', error);
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.error('Error fetching user by ID from MySQL:', error);
    throw error;
  }
};

const createUser = async (userData) => {
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
      [userData.name, userData.email, userData.role]
    );
    return { id: result.insertId, ...userData };
  } catch (error) {
    console.error('Error creating user in MySQL:', error);
    throw error;
  }
};

const updateUser = async (id, userData) => {
  try {
    await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
      [userData.name, userData.email, userData.role, id]
    );
    return { id, ...userData };
  } catch (error) {
    console.error('Error updating user in MySQL:', error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return { id };
  } catch (error) {
    console.error('Error deleting user from MySQL:', error);
    throw error;
  }
};

module.exports = {
  initialize,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};