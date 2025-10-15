const sparkServiceClient = require('../clients/sparkServiceClient');
const storageConfig = require('../config/storage');

/**
 * SparkMySQLDataService - Access MySQL using Spark Service
 * 
 * This service uses the separate Spark service container via HTTP
 * to execute queries against MySQL using Spark's JDBC connector.
 */
class SparkMySQLDataService {
  constructor() {
    this.tableName = 'users';
    this.jdbcUrl = `jdbc:mysql://${storageConfig.mysql.host}:${storageConfig.mysql.port}/${storageConfig.mysql.database}`;
    this.jdbcConfig = {
      url: this.jdbcUrl,
      user: storageConfig.mysql.user,
      password: storageConfig.mysql.password,
      driver: 'com.mysql.cj.jdbc.Driver'
    };
  }

  async initializeService() {
    console.log('Initializing SparkMySQLDataService...');
    
    // Check if Spark service is available
    const isHealthy = await sparkServiceClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Spark service is not available');
    }
    
    console.log('SparkMySQLDataService initialized successfully');
  }

  /**
   * Create a temporary view pointing to the MySQL table
   * This makes subsequent queries simpler
   */
  async createTempView() {
    const createViewQuery = `
      CREATE OR REPLACE TEMPORARY VIEW ${this.tempViewName}
      USING org.apache.spark.sql.jdbc
      OPTIONS (
        url '${this.jdbcUrl}',
        dbtable '${this.tableName}',
        user '${this.jdbcOptions.user}',
        password '${this.jdbcOptions.password}',
        driver '${this.jdbcOptions.driver}'
      )
    `;

    await sparkSessionManager.executeSQL(createViewQuery);
    console.log(`Created temporary view: ${this.tempViewName}`);
  }

  async getAllUsers() {
    try {
      const sql = `SELECT * FROM ${this.tableName}`;
      return await sparkServiceClient.executeMySQLQuery(sql, this.jdbcConfig);
    } catch (error) {
      console.error('Error fetching users via Spark:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const sql = `SELECT * FROM ${this.tableName} ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
      return await sparkServiceClient.executeMySQLQuery(sql, this.jdbcConfig);
    } catch (error) {
      console.error('Error fetching paginated users via Spark:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ${parseInt(id)}`;
      const results = await sparkServiceClient.executeMySQLQuery(sql, this.jdbcConfig);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID via Spark:', error);
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
      console.error('Error searching users via Spark:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tempViewName}`;
      const results = await sparkSessionManager.executeSQL(query);
      return results[0]?.count || 0;
    } catch (error) {
      console.error('Error getting user count via Spark:', error);
      throw error;
    }
  }

  /**
   * Write operations are not yet implemented for SparkSession
   * These would require using Spark's DataFrame write API
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
        message: 'SparkMySQLDataService using Spark Service',
        sparkServiceUrl: sparkServiceClient.baseUrl,
        userCount,
        jdbcUrl: this.jdbcUrl.replace(/password=[^&]+/, 'password=***') // Hide password
      };
    } catch (error) {
      return {
        status: 'error',
        message: `SparkMySQLDataService health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }
}

module.exports = SparkMySQLDataService;
