const { spawn } = require('child_process');
const path = require('path');

/**
 * SparkSessionManager - Manages Apache Spark in local mode using child_process
 * 
 * This implementation uses spark-sql CLI via child_process to execute queries
 * without requiring a separate Spark cluster or server.
 * 
 * Architecture:
 * - Spawns spark-sql process for each query
 * - Runs in local mode (local[*])
 * - Parses text output into JSON
 */
class SparkSessionManager {
  constructor() {
    this.sparkHome = process.env.SPARK_HOME || '/opt/spark';
    this.sparkSqlBin = path.join(this.sparkHome, 'bin', 'spark-sql');
    this.isInitialized = false;
    this.defaultConfig = {
      master: 'local[*]',
      driverMemory: '1g',
      executorMemory: '1g',
      sqlExtensions: 'io.delta.sql.DeltaSparkSessionExtension',
      catalog: 'org.apache.spark.sql.delta.catalog.DeltaCatalog'
    };
  }

  /**
   * Initialize Spark by testing basic query
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('SparkSessionManager already initialized');
      return;
    }

    console.log('Initializing SparkSessionManager in local mode...');
    console.log('SPARK_HOME:', this.sparkHome);

    try {
      // Test with a simple query
      const result = await this.executeSQL('SELECT 1 as test');
      
      if (result && result.length > 0) {
        this.isInitialized = true;
        console.log('SparkSessionManager initialized successfully');
        console.log('Running in local mode:', this.defaultConfig.master);
      } else {
        throw new Error('Spark test query returned no results');
      }
    } catch (error) {
      console.error('Failed to initialize SparkSessionManager:', error.message);
      throw error;
    }
  }

  /**
   * Execute SQL query using spark-sql CLI
   * @param {string} query - SQL query to execute
   * @param {object} options - Additional options
   * @returns {Promise<Array>} Query results as array of objects
   */
  async executeSQL(query, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--master', this.defaultConfig.master,
        '--conf', `spark.driver.memory=${this.defaultConfig.driverMemory}`,
        '--conf', `spark.executor.memory=${this.defaultConfig.executorMemory}`,
        '--conf', `spark.sql.extensions=${this.defaultConfig.sqlExtensions}`,
        '--conf', `spark.sql.catalog.spark_catalog=${this.defaultConfig.catalog}`,
        '--conf', 'spark.sql.cli.print.header=true',
        '-e', query
      ];

      // Add any custom configurations
      if (options.config) {
        Object.entries(options.config).forEach(([key, value]) => {
          args.push('--conf', `${key}=${value}`);
        });
      }

      console.log('Executing Spark SQL:', query.substring(0, 100) + (query.length > 100 ? '...' : ''));

      const sparkProcess = spawn(this.sparkSqlBin, args, {
        env: {
          ...process.env,
          SPARK_HOME: this.sparkHome,
          JAVA_HOME: process.env.JAVA_HOME || '/usr/lib/jvm/java-17-openjdk-amd64'
        }
      });

      let stdout = '';
      let stderr = '';

      sparkProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      sparkProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      sparkProcess.on('error', (error) => {
        console.error('Failed to start spark-sql process:', error);
        reject(new Error(`Failed to start Spark: ${error.message}`));
      });

      sparkProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Spark SQL failed with code:', code);
          console.error('stderr:', stderr);
          reject(new Error(`Spark SQL failed: ${stderr}`));
        } else {
          try {
            const results = this.parseSparkOutput(stdout);
            resolve(results);
          } catch (parseError) {
            console.error('Failed to parse Spark output:', parseError.message);
            console.error('Raw output:', stdout);
            reject(new Error(`Failed to parse results: ${parseError.message}`));
          }
        }
      });
    });
  }

  /**
   * Parse Spark SQL CLI output into JSON
   * 
   * Spark outputs data in ASCII table format:
   * col1  col2  col3
   * val1  val2  val3
   * val1  val2  val3
   * 
   * This parser converts it to: [{col1: val1, col2: val2, col3: val3}, ...]
   */
  parseSparkOutput(output) {
    const lines = output.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.startsWith('Time taken:'))
      .filter(line => !line.match(/^\d+ row/)) // Filter "X rows selected"
      .filter(line => line !== 'Response code'); // Filter spurious HTTP header

    if (lines.length === 0) {
      return [];
    }

    // First non-empty line is the header
    const headerLine = lines[0];
    const headers = headerLine.split(/\s+/).map(h => h.trim());

    if (headers.length === 0) {
      return [];
    }

    // Rest are data rows
    const dataLines = lines.slice(1);
    
    const results = dataLines.map(line => {
      const values = line.split(/\t+/); // Spark uses tabs
      
      const row = {};
      headers.forEach((header, index) => {
        const value = values[index] ? values[index].trim() : null;
        
        // Handle NULL values
        if (value === 'NULL' || value === 'null') {
          row[header] = null;
        }
        // Try to parse numbers
        else if (!isNaN(value) && value !== '') {
          row[header] = Number(value);
        }
        // Keep as string
        else {
          row[header] = value;
        }
      });
      
      return row;
    });

    return results;
  }

  /**
   * Read Parquet file using SparkSession
   */
  async readParquet(filePath) {
    const query = `SELECT * FROM parquet.\`${filePath}\``;
    return this.executeSQL(query);
  }

  /**
   * Read Delta table using SparkSession
   */
  async readDelta(deltaPath) {
    const query = `SELECT * FROM delta.\`${deltaPath}\``;
    return this.executeSQL(query);
  }

  /**
   * Read from JDBC source (MySQL, PostgreSQL, etc.)
   */
  async readJDBC(jdbcUrl, table, options = {}) {
    const user = options.user || 'root';
    const password = options.password || 'password';
    const driver = options.driver || 'com.mysql.cj.jdbc.Driver';

    // For JDBC, we need to construct the query differently
    // We'll use CREATE TEMPORARY VIEW to make it easier
    const tempView = `temp_${Date.now()}`;
    
    const createViewQuery = `
      CREATE OR REPLACE TEMPORARY VIEW ${tempView}
      USING org.apache.spark.sql.jdbc
      OPTIONS (
        url '${jdbcUrl}',
        dbtable '${table}',
        user '${user}',
        password '${password}',
        driver '${driver}'
      )
    `;

    try {
      // Create temp view
      await this.executeSQL(createViewQuery);
      
      // Query from temp view
      const selectQuery = `SELECT * FROM ${tempView}`;
      const results = await this.executeSQL(selectQuery);
      
      return results;
    } catch (error) {
      console.error('JDBC read failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Spark
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await this.executeSQL('SELECT 1 as health_check');
      
      return {
        status: 'healthy',
        message: 'SparkSession is operational in local mode',
        mode: this.defaultConfig.master,
        sparkHome: this.sparkHome,
        testQuery: result
      };
    } catch (error) {
      return {
        status: 'error',
        message: `SparkSession health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }

  /**
   * Stop Spark (cleanup)
   */
  async stop() {
    this.isInitialized = false;
    console.log('SparkSessionManager stopped');
  }
}

// Export singleton instance
module.exports = new SparkSessionManager();
