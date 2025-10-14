const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const util = require('util');

class SparkSessionManager {
  constructor() {
    this.initialized = false;
    this.deltaBasePath = path.join(__dirname, '..', 'data', 'delta');
    this.sparkProcess = null;
    
    // Spark configurations
    this.config = {
      // Core configurations
      'spark.master': 'local[2]',
      'spark.driver.memory': '512m',
      'spark.executor.memory': '512m',
      'spark.driver.maxResultSize': '256m',
      'spark.memory.fraction': '0.6',
      'spark.memory.storageFraction': '0.5',
      'spark.sql.shuffle.partitions': '4',
      'spark.sql.adaptive.enabled': 'true',
      'spark.sql.adaptive.coalescePartitions.enabled': 'true',
      
      // Delta Lake configurations
      'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
      'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
      'spark.sql.warehouse.dir': this.deltaBasePath,
      'spark.delta.logStore.class': 'org.apache.spark.sql.delta.storage.LocalLogStore',
      'spark.delta.checkpointInterval': '5',
      'spark.delta.merge.optimizeInsert.enabled': 'true',
      'spark.delta.optimizeWrite.enabled': 'true',
      'spark.delta.stats.skipping': 'true'
    };
  }

  async initialize() {
    if (this.initialized && this.sparkProcess) {
      console.log('Spark session already initialized and running');
      return;
    }

    // Reset state if partially initialized
    this.initialized = false;
    if (this.sparkProcess) {
      this.sparkProcess.kill();
      this.sparkProcess = null;
    }

    try {
      console.log('Creating Delta Lake directories at:', this.deltaBasePath);
      await fs.mkdir(this.deltaBasePath, { recursive: true });
      
      const deltaFiles = await fs.readdir(this.deltaBasePath);
      console.log('Delta directory contents:', deltaFiles);
      
      // Verify Spark environment
      console.log('Verifying Spark environment...');
      await this._verifySparkSetup();
      
      // Initialize Spark submit process with exponential backoff retry
      let retryCount = 0;
      const maxRetries = 5;
      const baseDelay = 1000; // Start with 1 second
      
      while (retryCount < maxRetries) {
        try {
          // Verify storage permissions before initialization
          await this._verifyStorageAccess();
          await this._initializeSparkProcess();
          break;
        } catch (error) {
          retryCount++;
          console.error(`Spark initialization attempt ${retryCount} failed:`, error);
          
          if (retryCount === maxRetries) {
            throw new Error(`Failed to initialize Spark after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000;
          console.log(`Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Verify connection
      await this.executeSparkSQL('SELECT 1');
      
      this.initialized = true;
      console.log('Spark session initialization completed successfully');
      
      // For embedded mode, use JDBC connection with in-memory warehouse
      this.connection = await this.client.connect({
        host: '127.0.0.1',
        port: 10000,
        path: '',
        warehouseDir: this.deltaBasePath,
        driver: 'org.apache.spark.sql.delta.sources.DeltaDataSource',
        mode: 'embedded',
        connectTimeout: 30000, // 30 seconds connection timeout
        socketTimeout: 60000,  // 60 seconds socket timeout
        retryAttempts: 3,     // Number of retry attempts
        retryDelay: 1000      // Delay between retries in milliseconds
      });

      this.initialized = true;
      console.log('Databricks SQL client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Spark session:', error);
      this.initialized = false;
      throw error;
    }
  }

  async _verifySparkSetup() {
    try {
      // Check if spark-submit is available
      await this._executeCommand('spark-submit --version');
      console.log('Spark environment verified successfully');
    } catch (error) {
      console.error('Spark environment verification failed:', error);
      throw new Error('Failed to verify Spark environment');
    }
  }

  async _verifyStorageAccess() {
    try {
      // Ensure Delta Lake directory exists and is writable
      await fs.access(this.deltaBasePath, fs.constants.W_OK);
      
      // Try to write a test file
      const testFile = path.join(this.deltaBasePath, '.test-write');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      console.log('Storage access verified successfully');
    } catch (error) {
      console.error('Storage access verification failed:', error);
      throw new Error(`Failed to verify storage access: ${error.message}`);
    }
  }

  async _initializeSparkProcess() {
    // Kill existing process if any
    if (this.sparkProcess) {
      this.sparkProcess.kill();
      this.sparkProcess = null;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
    }

    // Create config file
    const configPath = path.join(this.deltaBasePath, 'spark-config.properties');
    console.log('Creating Spark config file at:', configPath);
    
    const configContent = Object.entries(this.config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    await fs.writeFile(configPath, configContent);

    // Prepare Spark command
    const sparkCommand = 'spark-submit';
    const args = [
      '--properties-file', configPath,
      '--class', 'org.apache.spark.sql.delta.sources.DeltaDataSource',
      '--packages', 'io.delta:delta-core_2.12:2.2.0'
    ];

    console.log('Starting Spark process with command:', sparkCommand, args.join(' '));

    try {
      this.sparkProcess = spawn(sparkCommand, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.sparkProcess.stdout.on('data', (data) => {
        console.log('Spark process output:', data.toString());
      });

      this.sparkProcess.stderr.on('data', (data) => {
        console.error('Spark process error:', data.toString());
      });

      this.sparkProcess.on('close', (code) => {
        console.log('Spark process exited with code:', code);
        this.sparkProcess = null;
        this.initialized = false;
      });

      // Wait for Spark to initialize with better error handling
      await new Promise((resolve, reject) => {
        let isResolved = false;
        
        // Set up success detection
        const successTimeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        }, 10000);
        
        // Set up error detection
        const errorTimeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error('Spark process initialization timed out'));
          }
        }, 30000);
        
        // Listen for early failures
        this.sparkProcess.on('error', (error) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(successTimeout);
            clearTimeout(errorTimeout);
            reject(error);
          }
        });
        
        this.sparkProcess.on('exit', (code) => {
          if (!isResolved && code !== 0) {
            isResolved = true;
            clearTimeout(successTimeout);
            clearTimeout(errorTimeout);
            reject(new Error(`Spark process exited with code ${code}`));
          }
        });
        
        // Listen for successful startup indicators in the output
        const checkStartup = (data) => {
          const output = data.toString();
          if (output.includes('Spark session available')) {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(successTimeout);
              clearTimeout(errorTimeout);
              resolve();
            }
          }
        };
        
        this.sparkProcess.stdout.on('data', checkStartup);
        this.sparkProcess.stderr.on('data', checkStartup);
      });

      console.log('Spark process initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Spark process:', error);
      throw error;
    }
  }

  async _executeCommand(command) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command.split(' ')[0], command.split(' ').slice(1), {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data;
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data;
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async executeSparkSQL(sql) {
    if (!this.initialized || !this.sparkProcess) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      const result = await this._executeCommand(`spark-sql --execute "${sql.replace(/"/g, '\\"')}"`);
      return result.trim().split('\n').map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error executing Spark SQL:', error);
      throw error;
    }
  }

  async createDeltaTable(tableName, schema) {
    if (!this.initialized) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      const tablePath = path.join(this.deltaBasePath, tableName);
      const schemaDefinition = schema
        .map(field => `${field.name} ${field.type}`)
        .join(', ');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${tableName} (${schemaDefinition})
        USING DELTA
        LOCATION '${tablePath}'
      `;
      
      await this.executeSparkSQL(createTableSQL);
      console.log(`Delta table ${tableName} created successfully at ${tablePath}`);
    } catch (error) {
      console.error(`Failed to create Delta table ${tableName}:`, error);
      throw error;
    }
  }

  async vacuum(tableName, retentionHours = 168) {
    if (!this.initialized) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      const vacuumSQL = `VACUUM ${tableName} RETAIN ${retentionHours} HOURS`;
      await this.executeSparkSQL(vacuumSQL);
      console.log(`Vacuum completed for table ${tableName}`);
    } catch (error) {
      console.error(`Failed to vacuum table ${tableName}:`, error);
      throw error;
    }
  }

  async getTableHistory(tableName) {
    if (!this.initialized) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      const historySQL = `DESCRIBE HISTORY ${tableName}`;
      const result = await this.executeSparkSQL(historySQL);
      console.log(`Retrieved history for table ${tableName}`);
      return result;
    } catch (error) {
      console.error(`Failed to get history for table ${tableName}:`, error);
      throw error;
    }
  }

  async readVersionAsOf(tableName, version) {
    if (!this.initialized) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      const timeTraveSQL = `SELECT * FROM ${tableName} VERSION AS OF ${version}`;
      const result = await this.executeSparkSQL(timeTraveSQL);
      console.log(`Read version ${version} of table ${tableName}`);
      return result;
    } catch (error) {
      console.error(`Failed to read version ${version} of table ${tableName}:`, error);
      throw error;
    }
  }

  async optimize(tableName) {
    if (!this.initialized) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      const optimizeSQL = `OPTIMIZE ${tableName}`;
      await this.executeSparkSQL(optimizeSQL);
      console.log(`Optimization completed for table ${tableName}`);
    } catch (error) {
      console.error(`Failed to optimize table ${tableName}:`, error);
      throw error;
    }
  }

  async compactTable(tableName) {
    if (!this.initialized) {
      throw new Error('Spark session not initialized. Call initialize() first.');
    }

    try {
      console.log(`Starting table compaction for ${tableName}`);
      await this.optimize(tableName);
      await this.vacuum(tableName);
      console.log(`Table compaction completed for ${tableName}`);
    } catch (error) {
      console.error(`Failed to compact table ${tableName}:`, error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.initialized || !this.sparkProcess) {
        return {
          status: 'error',
          message: 'Spark session not initialized',
          config: this.config
        };
      }

      await this.executeSparkSQL('SELECT 1');
      return {
        status: 'healthy',
        message: 'Spark session is operational with Delta Lake support',
        config: this.config,
        deltaBasePath: this.deltaBasePath
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        config: this.config,
        deltaBasePath: this.deltaBasePath
      };
    }
  }
}

// Create and export singleton instance
const sparkSessionManager = new SparkSessionManager();
module.exports = sparkSessionManager;