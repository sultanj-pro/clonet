const mysql = require('mysql2/promise');
const storageConfig = require('../config/storage');

class MySQLDataService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      if (!this.pool) {
        this.pool = mysql.createPool({
          ...storageConfig.mysql,
          waitForConnections: true,
          connectionLimit: 10,
          connectTimeout: 60000
        });
        // Test the connection
        const connection = await this.pool.getConnection();
        await connection.release();
        console.log('MySQL connection pool initialized');
      }
    } catch (error) {
      console.error('Error initializing MySQL connection pool:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const [rows] = await this.pool.query('SELECT * FROM users');
      return rows;
    } catch (error) {
      console.error('Error fetching users from MySQL:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const [rows] = await this.pool.query('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?', [limit, offset]);
      return rows;
    } catch (error) {
      console.error('Error fetching paginated users from MySQL:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const [[{ total }]] = await this.pool.query('SELECT COUNT(*) as total FROM users');
      return total;
    } catch (error) {
      console.error('Error getting user count from MySQL:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM users WHERE name LIKE ? OR email LIKE ?',
        [`%${searchTerm}%`, `%${searchTerm}%`]
      );
      return rows;
    } catch (error) {
      console.error('Error searching users in MySQL:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const [rows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error fetching user by ID from MySQL:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const [result] = await this.pool.query(
        'INSERT INTO users (name, email, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [userData.name, userData.email]
      );
      const [newUser] = await this.pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return newUser[0];
    } catch (error) {
      console.error('Error creating user in MySQL:', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      await this.pool.query(
        'UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
        [userData.name, userData.email, id]
      );
      const [updatedUser] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return updatedUser[0];
    } catch (error) {
      console.error('Error updating user in MySQL:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
      return { id };
    } catch (error) {
      console.error('Error deleting user from MySQL:', error);
      throw error;
    }
  }

}

// Export the class
module.exports = MySQLDataService;