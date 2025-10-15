const sparkSessionManager = require('../config/sparkSessionManager');
const storageConfig = require('../config/storage');

/**
 * SparkMySQLDataService - Access MySQL using SparkSession JDBC
 * 
 * This service uses Spark's JDBC connector to read from MySQL
 * instead of the direct mysql2 library.
 */
class SparkMySQLDataService {
  constructor() {
    this.tableName = 'users';
    this.jdbcUrl = `jdbc:mysql://${storageConfig.mysql.host}:${storageConfig.mysql.port}/${storageConfig.mysql.database}`;
    this.jdbcOptions = {
      user: storageConfig.mysql.user,
      password: storageConfig.mysql.password,
      driver: 'com.mysql.cj.jdbc.Driver'
    };
    this.tempViewName = 'mysql_users_view';
  }

  async initializeService() {
    console.log('Initializing SparkMySQLDataService...');
    
    // Initialize SparkSession
    await sparkSessionManager.initialize();
    
    // Don't create temp view during initialization since we create it
    // in each query (temp views don't persist across spark-sql processes)
    
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
      // Include temp view creation in the same Spark SQL command
      const query = `
        CREATE OR REPLACE TEMPORARY VIEW ${this.tempViewName}
        USING org.apache.spark.sql.jdbc
        OPTIONS (
          url '${this.jdbcUrl}',
          dbtable '${this.tableName}',
          user '${this.jdbcOptions.user}',
          password '${this.jdbcOptions.password}',
          driver '${this.jdbcOptions.driver}'
        );
        
        SELECT * FROM ${this.tempViewName};
      `;
      return await sparkSessionManager.executeSQL(query);
    } catch (error) {
      console.error('Error fetching users via Spark:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const query = `
        CREATE OR REPLACE TEMPORARY VIEW ${this.tempViewName}
        USING org.apache.spark.sql.jdbc
        OPTIONS (
          url '${this.jdbcUrl}',
          dbtable '${this.tableName}',
          user '${this.jdbcOptions.user}',
          password '${this.jdbcOptions.password}',
          driver '${this.jdbcOptions.driver}'
        );
        
        SELECT * FROM ${this.tempViewName}
        ORDER BY id
        LIMIT ${limit} OFFSET ${offset};
      `;
      return await sparkSessionManager.executeSQL(query);
    } catch (error) {
      console.error('Error fetching paginated users via Spark:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const query = `
        CREATE OR REPLACE TEMPORARY VIEW ${this.tempViewName}
        USING org.apache.spark.sql.jdbc
        OPTIONS (
          url '${this.jdbcUrl}',
          dbtable '${this.tableName}',
          user '${this.jdbcOptions.user}',
          password '${this.jdbcOptions.password}',
          driver '${this.jdbcOptions.driver}'
        );
        
        SELECT * FROM ${this.tempViewName} WHERE id = ${parseInt(id)};
      `;
      const results = await sparkSessionManager.executeSQL(query);
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
      const sparkHealth = await sparkSessionManager.healthCheck();
      const userCount = await this.getUserCount();
      
      return {
        status: sparkHealth.status === 'healthy' ? 'healthy' : 'error',
        message: 'SparkMySQLDataService using SparkSession JDBC connector',
        sparkHealth,
        userCount,
        jdbcUrl: this.jdbcUrl.replace(/password=[^&]+/, 'password=***'), // Hide password
        tempView: this.tempViewName
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
