const sparkServiceClient = require('../clients/sparkServiceClient');
const path = require('path');

/**
 * SparkDeltaDataService - Access Delta Lake tables using Spark Service
 * 
 * This service uses the separate Spark service container via HTTP
 * to execute queries against Delta Lake tables using Spark's Delta connector.
 */
class SparkDeltaDataService {
  constructor() {
    this.dataPath = process.env.DELTA_PATH || '/data/delta';
    this.usersPath = path.join(this.dataPath, 'users');
  }

  async initializeService() {
    console.log('Initializing SparkDeltaDataService...');
    
    // Check if Spark service is available
    const isHealthy = await sparkServiceClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Spark service is not available');
    }
    
    console.log('SparkDeltaDataService initialized successfully');
  }

  async getAllUsers() {
    try {
      // Path is relative to Spark service container
      return await sparkServiceClient.executeDeltaQuery(this.usersPath);
    } catch (error) {
      console.error('Error fetching users from Delta via Spark:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const query = `
        SELECT * FROM delta.\`${this.usersPath}\`
        ORDER BY id
        LIMIT ${limit} OFFSET ${offset}
      `;
      return await sparkServiceClient.executeDeltaQuery(this.usersPath, query);
    } catch (error) {
      console.error('Error fetching paginated users from Delta via Spark:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const query = `SELECT * FROM delta.\`${this.usersPath}\` WHERE id = ${parseInt(id)}`;
      const results = await sparkServiceClient.executeDeltaQuery(this.usersPath, query);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID from Delta via Spark:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const query = `
        SELECT * FROM delta.\`${this.usersPath}\`
        WHERE name LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'
      `;
      return await sparkServiceClient.executeDeltaQuery(this.usersPath, query);
    } catch (error) {
      console.error('Error searching users in Delta via Spark:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const query = `SELECT COUNT(*) as count FROM delta.\`${this.usersPath}\``;
      const results = await sparkServiceClient.executeDeltaQuery(this.usersPath, query);
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
      return await sparkServiceClient.executeDeltaQuery(this.usersPath, query);
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
      const results = await sparkServiceClient.executeDeltaQuery(this.usersPath, query);
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
      const sparkHealth = await sparkServiceClient.healthCheck();
      const userCount = await this.getUserCount();
      const tableDetails = await this.getTableDetails();
      
      return {
        status: sparkHealth ? 'healthy' : 'error',
        message: 'SparkDeltaDataService using Spark Service via HTTP',
        sparkHealth,
        userCount,
        dataPath: this.usersPath,
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
