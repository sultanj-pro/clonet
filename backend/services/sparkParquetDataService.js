const sparkSessionManager = require('../config/sparkSessionManager');
const path = require('path');

/**
 * SparkParquetDataService - Access Parquet files using SparkSession
 * 
 * This service uses Spark's native Parquet reader instead of
 * the fs-based JSON file approach used in direct access mode.
 */
class SparkParquetDataService {
  constructor() {
    this.dataPath = process.env.PARQUET_PATH || '/app/data/parquet';
    this.usersPath = path.join(this.dataPath, 'users');
    this.tempViewName = 'parquet_users_view';
  }

  async initializeService() {
    console.log('Initializing SparkParquetDataService...');
    
    // Initialize SparkSession
    await sparkSessionManager.initialize();
    
    // Create temporary view for Parquet data
    await this.createTempView();
    
    console.log('SparkParquetDataService initialized successfully');
  }

  /**
   * Create a temporary view pointing to the Parquet directory
   */
  async createTempView() {
    const createViewQuery = `
      CREATE OR REPLACE TEMPORARY VIEW ${this.tempViewName}
      USING parquet
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
      console.error('Error fetching users from Parquet via Spark:', error);
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
      console.error('Error fetching paginated users from Parquet via Spark:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const query = `SELECT * FROM ${this.tempViewName} WHERE id = ${parseInt(id)}`;
      const results = await sparkSessionManager.executeSQL(query);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID from Parquet via Spark:', error);
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
      console.error('Error searching users in Parquet via Spark:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tempViewName}`;
      const results = await sparkSessionManager.executeSQL(query);
      return results[0]?.count || 0;
    } catch (error) {
      console.error('Error getting user count from Parquet via Spark:', error);
      throw error;
    }
  }

  /**
   * Write operations are not yet implemented for SparkSession
   * These would require using Spark's DataFrame write API with Parquet format
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
      
      return {
        status: sparkHealth.status === 'healthy' ? 'healthy' : 'error',
        message: 'SparkParquetDataService using SparkSession Parquet reader',
        sparkHealth,
        userCount,
        dataPath: this.usersPath,
        tempView: this.tempViewName
      };
    } catch (error) {
      return {
        status: 'error',
        message: `SparkParquetDataService health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }
}

module.exports = SparkParquetDataService;
