const { SparkSession } = require('apache-spark');

class SparkSessionManager {
  constructor() {
    this.spark = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return this.spark;
    }

    try {
      console.log('Initializing Spark Session...');
      
      this.spark = SparkSession.builder()
        .appName('Clonet-DataAccess')
        .master(process.env.SPARK_MASTER || 'local[*]')
        .config('spark.sql.adaptive.enabled', 'true')
        .config('spark.sql.adaptive.coalescePartitions.enabled', 'true')
        .config('spark.sql.warehouse.dir', '/opt/spark/warehouse')
        .config('spark.driver.memory', process.env.SPARK_DRIVER_MEMORY || '2g')
        .config('spark.executor.memory', process.env.SPARK_EXECUTOR_MEMORY || '2g')
        .config('spark.sql.execution.arrow.pyspark.enabled', 'true')
        // MySQL JDBC Configuration
        .config('spark.jars', '/opt/spark/jars/mysql-connector-java.jar')
        .config('spark.driver.extraClassPath', '/opt/spark/jars/mysql-connector-java.jar')
        .config('spark.executor.extraClassPath', '/opt/spark/jars/mysql-connector-java.jar')
        .getOrCreate();

      // Configure Spark context logging level
      this.spark.sparkContext.setLogLevel(process.env.SPARK_LOG_LEVEL || 'WARN');

      console.log('Spark Session initialized successfully');
      console.log(`Spark Version: ${this.spark.version}`);
      console.log(`Spark Master: ${this.spark.sparkContext.master}`);
      
      this.isInitialized = true;
      return this.spark;
      
    } catch (error) {
      console.error('Failed to initialize Spark Session:', error);
      throw new Error(`Spark initialization failed: ${error.message}`);
    }
  }

  getSession() {
    if (!this.isInitialized) {
      throw new Error('Spark Session not initialized. Call initialize() first.');
    }
    return this.spark;
  }

  async createJDBCDataFrame(tableName, options = {}) {
    const spark = this.getSession();
    
    const jdbcOptions = {
      url: `jdbc:mysql://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      driver: 'com.mysql.cj.jdbc.Driver',
      dbtable: tableName,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ...options
    };

    try {
      const dataFrame = await spark.read
        .format('jdbc')
        .options(jdbcOptions)
        .load();
      
      return dataFrame;
    } catch (error) {
      console.error(`Error creating DataFrame for table ${tableName}:`, error);
      throw error;
    }
  }

  async writeJDBCDataFrame(dataFrame, tableName, mode = 'append', options = {}) {
    const jdbcOptions = {
      url: `jdbc:mysql://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      driver: 'com.mysql.cj.jdbc.Driver',
      dbtable: tableName,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ...options
    };

    try {
      await dataFrame.write
        .mode(mode)
        .format('jdbc')
        .options(jdbcOptions)
        .save();
      
      console.log(`Successfully wrote DataFrame to table ${tableName}`);
    } catch (error) {
      console.error(`Error writing DataFrame to table ${tableName}:`, error);
      throw error;
    }
  }

  async executeSQL(sqlQuery) {
    const spark = this.getSession();
    
    try {
      const result = await spark.sql(sqlQuery);
      return result;
    } catch (error) {
      console.error('Error executing SQL query:', error);
      throw error;
    }
  }

  async stop() {
    if (this.spark && this.isInitialized) {
      try {
        await this.spark.stop();
        console.log('Spark Session stopped successfully');
        this.isInitialized = false;
        this.spark = null;
      } catch (error) {
        console.error('Error stopping Spark Session:', error);
      }
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'error', message: 'Spark Session not initialized' };
      }

      const spark = this.getSession();
      const testDF = await spark.range(1, 10);
      const count = await testDF.count();
      
      return {
        status: 'healthy',
        message: 'Spark Session is running',
        sparkVersion: spark.version,
        master: spark.sparkContext.master,
        testCount: count
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Spark health check failed: ${error.message}`
      };
    }
  }
}

// Singleton instance
const sparkSessionManager = new SparkSessionManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, stopping Spark Session...');
  await sparkSessionManager.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, stopping Spark Session...');
  await sparkSessionManager.stop();
  process.exit(0);
});

module.exports = sparkSessionManager;