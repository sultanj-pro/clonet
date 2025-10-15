const sparkServiceClient = require('../clients/sparkServiceClient');
const path = require('path');

/**
 * SparkParquetDataService - Access Parquet files using Spark Service
 * 
 * This service uses the separate Spark service container via HTTP
 * to execute queries against Parquet files using Spark's native reader.
 */
class SparkParquetDataService {
  constructor() {
    this.dataPath = process.env.PARQUET_PATH || '/data/parquet';
    this.usersPath = path.join(this.dataPath, 'users');
  }

  async initializeService() {
    console.log('Initializing SparkParquetDataService...');
    
    // Check if Spark service is available
    const isHealthy = await sparkServiceClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Spark service is not available');
    }
    
    console.log('SparkParquetDataService initialized successfully');
  }

  async getAllUsers() {
    try {
      // Path is relative to Spark service container
      return await sparkServiceClient.executeParquetQuery(this.usersPath);
    } catch (error) {
      console.error('Error fetching users from Parquet via Spark:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const sql = `SELECT * FROM parquet_data ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
      return await sparkServiceClient.executeParquetQuery(this.usersPath, sql);
    } catch (error) {
      console.error('Error fetching paginated users from Parquet via Spark:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const sql = `SELECT * FROM parquet_data WHERE id = ${parseInt(id)}`;
      const results = await sparkServiceClient.executeParquetQuery(this.usersPath, sql);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID from Parquet via Spark:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const sql = `SELECT * FROM parquet_data WHERE name LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'`;
      return await sparkServiceClient.executeParquetQuery(this.usersPath, sql);
    } catch (error) {
      console.error('Error searching users in Parquet via Spark:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const sql = `SELECT COUNT(*) as count FROM parquet_data`;
      const results = await sparkServiceClient.executeParquetQuery(this.usersPath, sql);
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
      const isHealthy = await sparkServiceClient.healthCheck();
      const userCount = await this.getUserCount();
      
      return {
        status: isHealthy ? 'healthy' : 'error',
        message: 'SparkParquetDataService using Spark Service',
        sparkServiceUrl: sparkServiceClient.baseUrl,
        userCount,
        dataPath: this.usersPath
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
