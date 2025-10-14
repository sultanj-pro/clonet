const path = require('path');
const sparkSessionManager = require('../config/sparkSessionManager');

class ParquetDataService {
  constructor() {
    this.sparkManager = sparkSessionManager;
    this.tableName = 'users';
    this.schema = [
      { name: 'id', type: 'BIGINT' },
      { name: 'name', type: 'STRING' },
      { name: 'email', type: 'STRING' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ];
    this.initialized = false;
  }

  async initializeService() {
    // Always reset initialization state
    this.initialized = false;
    
    try {
      console.log('Starting ParquetDataService initialization...');
      console.log('Schema to be used:', JSON.stringify(this.schema, null, 2));
      
      // Initialize Spark with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Initializing Spark session (attempt ${retryCount + 1}/${maxRetries})...`);
          await this.sparkManager.initialize();
          break;
        } catch (error) {
          retryCount++;
          console.error(`Spark initialization attempt ${retryCount} failed:`, error);
          
          if (retryCount === maxRetries) {
            throw new Error(`Failed to initialize Spark after ${maxRetries} attempts: ${error.message}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Verify Spark is healthy
      const health = await this.sparkManager.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Spark health check failed: ${health.message}`);
      }
      
      console.log('Creating Delta table...');
      await this.sparkManager.createDeltaTable(this.tableName, this.schema);
      
      // Verify table creation
      const verifySQL = `SHOW TABLES LIKE '${this.tableName}'`;
      const tables = await this.sparkManager.executeSparkSQL(verifySQL);
      
      if (!tables.some(t => t.tableName === this.tableName)) {
        throw new Error(`Table ${this.tableName} was not created successfully`);
      }
      
      this.initialized = true;
      console.log('ParquetDataService initialized successfully with Delta Lake support');
    } catch (error) {
      console.error('Failed to initialize ParquetDataService:', {
        error: error.message,
        stack: error.stack,
        schema: this.schema,
        tableName: this.tableName
      });
      this.initialized = false;
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const result = await this.sparkManager.executeSparkSQL(`
        SELECT 
          CAST(id AS STRING) as id,
          name,
          email,
          CAST(created_at AS STRING) as created_at,
          CAST(updated_at AS STRING) as updated_at 
        FROM ${this.tableName}
      `);
      
      return this._parseResults(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const result = await this.sparkManager.executeSparkSQL(`
        SELECT 
          CAST(id AS STRING) as id,
          name,
          email,
          CAST(created_at AS STRING) as created_at,
          CAST(updated_at AS STRING) as updated_at 
        FROM ${this.tableName}
        WHERE id = ${id}
      `);
      
      const users = this._parseResults(result);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      // Get the next ID
      const idResult = await this.sparkManager.executeSparkSQL(`
        SELECT COALESCE(MAX(id), 0) + 1 as next_id 
        FROM ${this.tableName}
      `);
      
      const next_id = parseInt(idResult[0]?.next_id) || 1;
      const now = new Date().toISOString();
      
      // Insert the new user using MERGE for idempotency
      await this.sparkManager.executeSparkSQL(`
        MERGE INTO ${this.tableName} as target
        USING (
          SELECT 
            ${next_id} as id,
            '${userData.name}' as name,
            '${userData.email}' as email,
            CAST('${now}' AS TIMESTAMP) as created_at,
            CAST('${now}' AS TIMESTAMP) as updated_at
        ) as source
        ON target.id = source.id
        WHEN NOT MATCHED THEN INSERT *
      `);
      
      return {
        id: next_id,
        ...userData,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const now = new Date().toISOString();
      
      // Update using MERGE for atomic operation
      await this.sparkManager.executeSparkSQL(`
        MERGE INTO ${this.tableName} as target
        USING (
          SELECT 
            ${id} as id,
            '${userData.name}' as name,
            '${userData.email}' as email,
            CAST('${now}' AS TIMESTAMP) as updated_at
        ) as source
        ON target.id = source.id
        WHEN MATCHED THEN UPDATE SET
          name = source.name,
          email = source.email,
          updated_at = source.updated_at
      `);
      
      return await this.getUserById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      await this.sparkManager.executeSparkSQL(`
        DELETE FROM ${this.tableName} WHERE id = ${id}
      `);
      return { success: true, id };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const result = await this.sparkManager.executeSparkSQL(`
        SELECT 
          CAST(id AS STRING) as id,
          name,
          email,
          CAST(created_at AS STRING) as created_at,
          CAST(updated_at AS STRING) as updated_at 
        FROM ${this.tableName}
        WHERE LOWER(name) LIKE '%${searchTerm.toLowerCase()}%'
        OR LOWER(email) LIKE '%${searchTerm.toLowerCase()}%'
      `);
      
      return this._parseResults(result);
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const result = await this.sparkManager.executeSparkSQL(`
        SELECT 
          CAST(id AS STRING) as id,
          name,
          email,
          CAST(created_at AS STRING) as created_at,
          CAST(updated_at AS STRING) as updated_at 
        FROM ${this.tableName}
        ORDER BY id
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      return this._parseResults(result);
    } catch (error) {
      console.error('Error fetching paginated users:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const result = await this.sparkManager.executeSparkSQL(`
        SELECT COUNT(*) as count FROM ${this.tableName}
      `);
      
      return parseInt(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting user count:', error);
      throw error;
    }
  }

  // Delta Lake specific features
  async getTableHistory() {
    return await this.sparkManager.getTableHistory(this.tableName);
  }

  async getUsersAsOf(version) {
    const result = await this.sparkManager.readVersionAsOf(this.tableName, version);
    return this._parseResults(result);
  }

  async optimize() {
    await this.sparkManager.compactTable(this.tableName);
  }

  // Helper method to parse Databricks SQL results
  _parseResults(result) {
    if (!result || !Array.isArray(result)) return [];
    
    return result.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      email: row.email,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  async healthCheck() {
    try {
      const sparkHealth = await this.sparkManager.healthCheck();
      const userCount = await this.getUserCount();
      
      return {
        status: 'healthy',
        message: 'ParquetDataService is operational with Delta Lake',
        sparkStatus: sparkHealth,
        userCount
      };
    } catch (error) {
      return {
        status: 'error',
        message: `ParquetDataService health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }
}

module.exports = ParquetDataService;