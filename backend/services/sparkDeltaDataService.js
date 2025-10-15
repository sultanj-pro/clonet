const sparkSessionManager = require('../config/sparkSessionManager');
const path = require('path');

/**
 * SparkDeltaDataService - Access Delta Lake tables using SparkSession
 * 
 * This service uses Spark's Delta Lake connector to read Delta tables
 * instead of the fs-based JSON file approach used in direct access mode.
 */
class SparkDeltaDataService {
  constructor() {
    this.dataPath = process.env.DELTA_PATH || '/app/data/delta';
    this.usersPath = path.join(this.dataPath, 'users');
    this.tempViewName = 'delta_users_view';
  }

  async initializeService() {
    console.log('Initializing SparkDeltaDataService...');
    
    // Initialize SparkSession
    await sparkSessionManager.initialize();
    
    // Create temporary view for Delta table
    await this.createTempView();
    
    console.log('SparkDeltaDataService initialized successfully');
  }

  /**
   * Create a temporary view pointing to the Delta table
   */
  async createTempView() {
    const createViewQuery = `
      CREATE OR REPLACE TEMPORARY VIEW ${this.tempViewName}
      USING delta
      OPTIONS (path '${this.usersPath}')
    `;

    await sparkSessionManager.executeSQL(createViewQuery);
    console.log(`Created temporary view: ${this.tempViewName} from ${this.usersPath}`);
  }

  async getAllUsers() {
    try {
      const query = `SELECT * FROM ${this.tempViewName}`;
      return await sparkSessionManager.executeSQL(query);
    } catch (error) {
      console.error('Error fetching users from Delta via Spark:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const query = `
        SELECT * FROM ${this.tempViewName}
        ORDER BY id
        LIMIT ${limit} OFFSET ${offset}
      `;
      return await sparkSessionManager.executeSQL(query);
    } catch (error) {
      console.error('Error fetching paginated users from Delta via Spark:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const query = `SELECT * FROM ${this.tempViewName} WHERE id = ${parseInt(id)}`;
      const results = await sparkSessionManager.executeSQL(query);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID from Delta via Spark:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const query = `
        SELECT * FROM ${this.tempViewName}
        WHERE name LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'
      `;
      return await sparkSessionManager.executeSQL(query);
    } catch (error) {
      console.error('Error searching users in Delta via Spark:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tempViewName}`;
      const results = await sparkSessionManager.executeSQL(query);
      return results[0]?.count || 0;
    } catch (error) {
      console.error('Error getting user count from Delta via Spark:', error);
      throw error;
    }
  }

  /**
   * Delta Lake specific: Get table history
   * Shows the transaction log for the Delta table
   */
  async getTableHistory() {
    try {
      const query = `DESCRIBE HISTORY delta.\`${this.usersPath}\` LIMIT 10`;
      return await sparkSessionManager.executeSQL(query);
    } catch (error) {
      console.error('Error getting Delta table history via Spark:', error);
      throw error;
    }
  }

  /**
   * Delta Lake specific: Get table details
   * Shows metadata about the Delta table
   */
  async getTableDetails() {
    try {
      const query = `DESCRIBE DETAIL delta.\`${this.usersPath}\``;
      const results = await sparkSessionManager.executeSQL(query);
      return results[0] || null;
    } catch (error) {
      console.error('Error getting Delta table details via Spark:', error);
      throw error;
    }
  }

  /**
   * Write operations are not yet implemented for SparkSession
   * These would require using Spark's DataFrame write API with Delta format
   * For now, we throw helpful errors
   */
  async createUser(userData) {
    throw new Error('Write operations not yet supported via SparkSession. Switch to direct access mode to create users.');
  }

  async updateUser(id, userData) {
    throw new Error('Write operations not yet supported via SparkSession. Switch to direct access mode to update users.');
  }

  async deleteUser(id) {
    throw new Error('Write operations not yet supported via SparkSession. Switch to direct access mode to delete users.');
  }

  async healthCheck() {
    try {
      const sparkHealth = await sparkSessionManager.healthCheck();
      const userCount = await this.getUserCount();
      const tableDetails = await this.getTableDetails();
      
      return {
        status: sparkHealth.status === 'healthy' ? 'healthy' : 'error',
        message: 'SparkDeltaDataService using SparkSession Delta Lake connector',
        sparkHealth,
        userCount,
        dataPath: this.usersPath,
        tempView: this.tempViewName,
        deltaDetails: tableDetails
      };
    } catch (error) {
      return {
        status: 'error',
        message: `SparkDeltaDataService health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }
}

module.exports = SparkDeltaDataService;
