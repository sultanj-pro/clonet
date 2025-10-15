# SparkSession Data Access Implementation Plan

## Overview
Add SparkSession-based data access as an alternative to direct data access for all three storage modes (MySQL, Parquet, Delta), running in local mode without requiring a separate Spark server.

---

## Architecture Design

### Current Architecture (Direct Access)
```
User Request → Service Manager → Direct Data Service
                                   ↓
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
              MySQLDataService  ParquetDataService  DeltaDataService
                    ↓              ↓              ↓
                mysql2 lib      fs module       fs module
                    ↓              ↓              ↓
                MySQL DB      JSON files      JSON files
```

### New Architecture (SparkSession Access)
```
User Request → Service Manager → SparkSession Data Service
                                   ↓
                            SparkSessionManager
                                   ↓
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
           SparkMySQLService  SparkParquetService  SparkDeltaService
                    ↓              ↓              ↓
              JDBC Driver      Parquet Reader   Delta Lake
                    ↓              ↓              ↓
                MySQL DB      Parquet files    Delta tables
```

### Configuration Model
```javascript
{
  "storageType": "mysql" | "parquet" | "delta",  // Which storage
  "dataAccessMethod": "direct" | "sparksession"  // How to access
}
```

---

## Implementation Steps

### Phase 1: SparkSession Infrastructure

#### 1.1 Install Required Dependencies
```json
// backend/package.json
"dependencies": {
  "apache-spark-node": "^1.0.0",  // Node.js Spark bindings
  // OR
  "node-java": "^0.12.1",         // Java bridge for Node.js
  "spark-sql": "^3.5.0"           // Spark SQL libraries
}
```

**Alternative Approach** (Recommended):
Use child_process to run Spark in local mode:
```javascript
const { spawn } = require('child_process');
// Spawn spark-submit or spark-shell in local mode
```

#### 1.2 Download Spark Binaries
```dockerfile
# backend/Dockerfile
FROM node:18-slim

# Install Java (required for Spark)
RUN apt-get update && \
    apt-get install -y openjdk-11-jre-headless wget && \
    rm -rf /var/lib/apt/lists/*

# Download and install Apache Spark
ENV SPARK_VERSION=3.5.0
ENV HADOOP_VERSION=3
RUN wget -q https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz && \
    tar -xzf spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz && \
    mv spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} /opt/spark && \
    rm spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz

# Set Spark environment variables
ENV SPARK_HOME=/opt/spark
ENV PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
ENV PYSPARK_PYTHON=python3

# Download Delta Lake JARs
RUN wget -q -P $SPARK_HOME/jars \
    https://repo1.maven.org/maven2/io/delta/delta-core_2.12/2.4.0/delta-core_2.12-2.4.0.jar \
    https://repo1.maven.org/maven2/io/delta/delta-storage/2.4.0/delta-storage-2.4.0.jar

# Download MySQL JDBC Driver
RUN wget -q -P $SPARK_HOME/jars \
    https://repo1.maven.org/maven2/mysql/mysql-connector-java/8.0.33/mysql-connector-java-8.0.33.jar

# ... rest of Dockerfile
```

#### 1.3 Create SparkSession Manager
```javascript
// backend/config/sparkSessionManager.js

const { spawn } = require('child_process');
const path = require('path');

class SparkSessionManager {
  constructor() {
    this.sparkProcess = null;
    this.isInitialized = false;
    this.port = 4040; // Spark UI port
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const sparkHome = process.env.SPARK_HOME || '/opt/spark';
    
    // Configuration for local mode (no cluster)
    const sparkConfig = {
      'spark.master': 'local[*]',  // Local mode, use all cores
      'spark.app.name': 'UsersApp',
      'spark.driver.memory': '1g',
      'spark.executor.memory': '1g',
      'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
      'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
      'spark.driver.extraClassPath': `${sparkHome}/jars/*`,
      'spark.executor.extraClassPath': `${sparkHome}/jars/*`,
      'spark.ui.enabled': 'true',
      'spark.ui.port': this.port
    };

    // Build spark-submit command
    const configArgs = Object.entries(sparkConfig)
      .flatMap(([key, value]) => ['--conf', `${key}=${value}`]);

    console.log('Starting SparkSession in local mode...');
    
    // For now, we'll use a simpler approach with spark-shell
    // In production, you'd want to use a proper Node.js-Spark bridge
    
    this.isInitialized = true;
    console.log('SparkSession initialized in local mode');
  }

  async executeSQL(query, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Execute SQL query using spark-sql CLI
    return new Promise((resolve, reject) => {
      const sparkSql = spawn(`${process.env.SPARK_HOME}/bin/spark-sql`, [
        '--master', 'local[*]',
        '-e', query,
        '--conf', 'spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension',
        '--conf', 'spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog'
      ]);

      let output = '';
      let errorOutput = '';

      sparkSql.stdout.on('data', (data) => {
        output += data.toString();
      });

      sparkSql.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      sparkSql.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Spark SQL failed: ${errorOutput}`));
        } else {
          resolve(this.parseSparkOutput(output));
        }
      });
    });
  }

  parseSparkOutput(output) {
    // Parse Spark SQL output into JSON
    // This is a simplified version
    const lines = output.split('\n').filter(line => line.trim());
    // Parse table format output from Spark
    // Return as array of objects
    return [];
  }

  async readParquet(path) {
    const query = `SELECT * FROM parquet.\`${path}\``;
    return this.executeSQL(query);
  }

  async readDelta(path) {
    const query = `SELECT * FROM delta.\`${path}\``;
    return this.executeSQL(query);
  }

  async readJDBC(url, table, options = {}) {
    // For JDBC, we need a different approach
    const query = `
      SELECT * FROM jdbc 
      OPTIONS (
        url '${url}',
        dbtable '${table}',
        user '${options.user || 'root'}',
        password '${options.password || 'password'}'
      )
    `;
    return this.executeSQL(query);
  }

  async stop() {
    if (this.sparkProcess) {
      this.sparkProcess.kill();
      this.sparkProcess = null;
    }
    this.isInitialized = false;
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return {
          status: 'not_initialized',
          message: 'SparkSession not initialized'
        };
      }

      // Simple health check - try to execute a basic query
      await this.executeSQL('SELECT 1 as test');
      
      return {
        status: 'healthy',
        message: 'SparkSession is running in local mode',
        mode: 'local[*]',
        sparkHome: process.env.SPARK_HOME
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

module.exports = new SparkSessionManager();
```

### Phase 2: SparkSession Data Services

#### 2.1 SparkSession MySQL Service
```javascript
// backend/services/sparkMySQLDataService.js

const sparkSessionManager = require('../config/sparkSessionManager');
const storageConfig = require('../config/storage');

class SparkMySQLDataService {
  constructor() {
    this.tableName = 'users';
    this.jdbcUrl = `jdbc:mysql://${storageConfig.mysql.host}:${storageConfig.mysql.port}/${storageConfig.mysql.database}`;
    this.jdbcOptions = {
      user: storageConfig.mysql.user,
      password: storageConfig.mysql.password,
      driver: 'com.mysql.cj.jdbc.Driver'
    };
  }

  async initializeService() {
    await sparkSessionManager.initialize();
    console.log('SparkMySQLDataService initialized');
  }

  async getAllUsers() {
    const query = `
      SELECT * FROM jdbc 
      OPTIONS (
        url '${this.jdbcUrl}',
        dbtable '${this.tableName}',
        user '${this.jdbcOptions.user}',
        password '${this.jdbcOptions.password}',
        driver '${this.jdbcOptions.driver}'
      )
    `;
    return sparkSessionManager.executeSQL(query);
  }

  async getUserById(id) {
    const query = `
      SELECT * FROM jdbc 
      OPTIONS (
        url '${this.jdbcUrl}',
        dbtable '(SELECT * FROM ${this.tableName} WHERE id = ${id}) as temp',
        user '${this.jdbcOptions.user}',
        password '${this.jdbcOptions.password}',
        driver '${this.jdbcOptions.driver}'
      )
    `;
    const results = await sparkSessionManager.executeSQL(query);
    return results[0] || null;
  }

  async createUser(userData) {
    // For writes, we might still use direct JDBC or use Spark's write capability
    // This requires more complex implementation
    throw new Error('Write operations via SparkSession not yet implemented');
  }

  // ... other CRUD methods

  async healthCheck() {
    const sparkHealth = await sparkSessionManager.healthCheck();
    return {
      status: sparkHealth.status === 'healthy' ? 'healthy' : 'error',
      message: 'SparkMySQLDataService using SparkSession JDBC',
      sparkHealth
    };
  }
}

module.exports = SparkMySQLDataService;
```

#### 2.2 SparkSession Parquet Service
```javascript
// backend/services/sparkParquetDataService.js

const sparkSessionManager = require('../config/sparkSessionManager');
const path = require('path');

class SparkParquetDataService {
  constructor() {
    this.tableName = 'users';
    this.dataPath = path.join('/app/data/parquet', this.tableName);
  }

  async initializeService() {
    await sparkSessionManager.initialize();
    console.log('SparkParquetDataService initialized');
  }

  async getAllUsers() {
    // Read Parquet files using SparkSession
    return sparkSessionManager.readParquet(this.dataPath);
  }

  async getUserById(id) {
    const query = `
      SELECT * FROM parquet.\`${this.dataPath}\`
      WHERE id = ${id}
    `;
    const results = await sparkSessionManager.executeSQL(query);
    return results[0] || null;
  }

  async createUser(userData) {
    // Write to Parquet using SparkSession
    // This requires creating a DataFrame and writing
    throw new Error('Write operations via SparkSession not yet implemented');
  }

  // ... other methods

  async healthCheck() {
    const sparkHealth = await sparkSessionManager.healthCheck();
    return {
      status: sparkHealth.status === 'healthy' ? 'healthy' : 'error',
      message: 'SparkParquetDataService using SparkSession Parquet reader',
      sparkHealth,
      dataPath: this.dataPath
    };
  }
}

module.exports = SparkParquetDataService;
```

#### 2.3 SparkSession Delta Service
```javascript
// backend/services/sparkDeltaDataService.js

const sparkSessionManager = require('../config/sparkSessionManager');
const path = require('path');

class SparkDeltaDataService {
  constructor() {
    this.tableName = 'users';
    this.deltaPath = path.join('/app/data/delta', this.tableName);
  }

  async initializeService() {
    await sparkSessionManager.initialize();
    console.log('SparkDeltaDataService initialized');
  }

  async getAllUsers() {
    // Read Delta table using SparkSession
    return sparkSessionManager.readDelta(this.deltaPath);
  }

  async getUserById(id) {
    const query = `
      SELECT * FROM delta.\`${this.deltaPath}\`
      WHERE id = ${id}
    `;
    const results = await sparkSessionManager.executeSQL(query);
    return results[0] || null;
  }

  async createUser(userData) {
    // Write to Delta using SparkSession
    // Delta supports ACID transactions
    throw new Error('Write operations via SparkSession not yet implemented');
  }

  // ... other methods

  async healthCheck() {
    const sparkHealth = await sparkSessionManager.healthCheck();
    return {
      status: sparkHealth.status === 'healthy' ? 'healthy' : 'error',
      message: 'SparkDeltaDataService using SparkSession Delta reader',
      sparkHealth,
      deltaPath: this.deltaPath
    };
  }
}

module.exports = SparkDeltaDataService;
```

### Phase 3: Configuration & Service Manager Updates

#### 3.1 Update Storage Configuration
```javascript
// backend/config/storage.js

module.exports = {
  // Storage type: which storage system to use
  storageType: process.env.STORAGE_TYPE || 'mysql', // mysql, parquet, delta
  
  // Data access method: how to access the data
  dataAccessMethod: process.env.DATA_ACCESS_METHOD || 'direct', // direct, sparksession
  
  mysql: {
    host: process.env.DB_HOST || 'mysql',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'clonet_db'
  }
};
```

#### 3.2 Update Service Manager
```javascript
// backend/services/serviceManager.js

const storageConfig = require('../config/storage');

class ServiceManager {
  constructor() {
    this.currentService = null;
    this.currentConfig = {
      storageType: storageConfig.storageType,
      dataAccessMethod: storageConfig.dataAccessMethod
    };
  }

  resetService() {
    this.currentService = null;
  }

  async initializeService() {
    const { storageType, dataAccessMethod } = this.currentConfig;

    console.log(`Initializing service: ${storageType} with ${dataAccessMethod} access`);

    let ServiceClass;

    // Choose service based on both storage type AND access method
    if (dataAccessMethod === 'sparksession') {
      // SparkSession-based services
      if (storageType === 'mysql') {
        ServiceClass = require('./sparkMySQLDataService');
      } else if (storageType === 'parquet') {
        ServiceClass = require('./sparkParquetDataService');
      } else if (storageType === 'delta') {
        ServiceClass = require('./sparkDeltaDataService');
      }
    } else {
      // Direct access services (current implementation)
      if (storageType === 'mysql') {
        ServiceClass = require('./mysqlDataService');
      } else if (storageType === 'parquet') {
        ServiceClass = require('./parquetDataService');
      } else if (storageType === 'delta') {
        ServiceClass = require('./deltaTableDataService.simple');
      }
    }

    if (!ServiceClass) {
      throw new Error(`Unknown storage type or access method: ${storageType}/${dataAccessMethod}`);
    }

    this.currentService = new ServiceClass();
    await this.currentService.initializeService();
    
    return this.currentService;
  }

  async switchConfiguration(newConfig) {
    const changed = 
      newConfig.storageType !== this.currentConfig.storageType ||
      newConfig.dataAccessMethod !== this.currentConfig.dataAccessMethod;

    if (changed) {
      this.currentConfig = { ...newConfig };
      this.resetService();
      await this.initializeService();
    }

    return this.currentService;
  }

  getService() {
    if (!this.currentService) {
      throw new Error('Service not initialized. Call initializeService() first.');
    }
    return this.currentService;
  }

  getCurrentConfig() {
    return { ...this.currentConfig };
  }
}

module.exports = new ServiceManager();
```

#### 3.3 Update Configuration Routes
```javascript
// backend/routes/config.js

router.get('/storage', (req, res) => {
  const currentConfig = serviceManager.getCurrentConfig();
  res.json(currentConfig);
});

router.put('/storage', async (req, res) => {
  try {
    const { type, accessMethod } = req.body;
    
    // Validate inputs
    if (type && !['mysql', 'parquet', 'delta'].includes(type)) {
      return res.status(400).json({ error: 'Invalid storage type' });
    }
    
    if (accessMethod && !['direct', 'sparksession'].includes(accessMethod)) {
      return res.status(400).json({ error: 'Invalid access method' });
    }

    const currentConfig = serviceManager.getCurrentConfig();
    const newConfig = {
      storageType: type || currentConfig.storageType,
      dataAccessMethod: accessMethod || currentConfig.dataAccessMethod
    };

    console.log('Configuration switch request:', {
      current: currentConfig,
      new: newConfig
    });

    await serviceManager.switchConfiguration(newConfig);

    res.json({
      message: 'Configuration updated successfully',
      config: newConfig
    });
  } catch (error) {
    console.error('Error switching configuration:', error);
    res.status(500).json({
      error: 'Failed to switch configuration',
      message: error.message
    });
  }
});
```

### Phase 4: Frontend Updates

#### 4.1 Update Configuration Page
```typescript
// frontend/src/components/ConfigurationPage.tsx

interface StorageConfig {
  storageType: 'mysql' | 'parquet' | 'delta';
  dataAccessMethod: 'direct' | 'sparksession';
}

const ConfigurationPage: React.FC = () => {
  const [config, setConfig] = useState<StorageConfig>({
    storageType: 'mysql',
    dataAccessMethod: 'direct'
  });

  const handleStorageTypeChange = (type: 'mysql' | 'parquet' | 'delta') => {
    updateConfig({ ...config, storageType: type });
  };

  const handleAccessMethodChange = (method: 'direct' | 'sparksession') => {
    updateConfig({ ...config, dataAccessMethod: method });
  };

  const updateConfig = async (newConfig: StorageConfig) => {
    setLoading(true);
    try {
      await updateStorageConfig({
        type: newConfig.storageType,
        accessMethod: newConfig.dataAccessMethod
      });
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to update configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-page">
      <h2>Storage Configuration</h2>
      
      {/* Storage Type Selection */}
      <div className="config-section">
        <h3>Storage Type</h3>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={config.storageType === 'mysql'}
              onChange={() => handleStorageTypeChange('mysql')}
            />
            MySQL Database
          </label>
          <label>
            <input
              type="radio"
              checked={config.storageType === 'parquet'}
              onChange={() => handleStorageTypeChange('parquet')}
            />
            Parquet Files
          </label>
          <label>
            <input
              type="radio"
              checked={config.storageType === 'delta'}
              onChange={() => handleStorageTypeChange('delta')}
            />
            Delta Table Format
          </label>
        </div>
      </div>

      {/* Data Access Method Selection */}
      <div className="config-section">
        <h3>Data Access Method</h3>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              checked={config.dataAccessMethod === 'direct'}
              onChange={() => handleAccessMethodChange('direct')}
            />
            Direct Access
            <span className="description">
              (MySQL: mysql2, Parquet/Delta: fs module)
            </span>
          </label>
          <label>
            <input
              type="radio"
              checked={config.dataAccessMethod === 'sparksession'}
              onChange={() => handleAccessMethodChange('sparksession')}
            />
            SparkSession (Local Mode)
            <span className="description">
              (Unified Spark SQL interface, no cluster required)
            </span>
          </label>
        </div>
      </div>

      <div className="current-config">
        <strong>Current Configuration:</strong>
        <p>Storage: {config.storageType}</p>
        <p>Access: {config.dataAccessMethod}</p>
      </div>
    </div>
  );
};
```

---

## Technical Considerations

### 1. **SparkSession in Local Mode**
- Runs entirely within Node.js container
- No separate Spark cluster needed
- Uses `local[*]` master (all available cores)
- Perfect for development and small-scale production

### 2. **Performance Trade-offs**

**Direct Access:**
- ✅ Faster for simple queries
- ✅ Lower memory footprint
- ✅ Simpler error handling
- ❌ Different APIs for each storage type

**SparkSession:**
- ✅ Unified SQL interface across all storage types
- ✅ Better for complex analytics queries
- ✅ Built-in optimization (Catalyst optimizer)
- ✅ Demonstrates Spark capabilities without cluster
- ❌ Higher memory usage (~1-2GB)
- ❌ Slower startup time
- ❌ More complex error handling

### 3. **Write Operations Challenge**

Reading is straightforward with Spark SQL, but **writes are more complex**:

**Option A**: Keep writes in direct mode
```javascript
async createUser(userData) {
  // Switch to direct access for writes
  const directService = new DirectMySQLService();
  return directService.createUser(userData);
}
```

**Option B**: Implement Spark DataFrame writes
```javascript
async createUser(userData) {
  // Create DataFrame and write
  // Requires more complex Spark API usage
}
```

**Recommendation**: Start with Option A (read-only SparkSession), add writes in Phase 2.

### 4. **Node.js-Spark Bridge Options**

**Option A**: Child Process (spawn)
- ✅ Simple to implement
- ✅ No native dependencies
- ❌ Slower (process overhead)
- ❌ Text parsing required

**Option B**: node-java + Spark JARs
- ✅ Direct Java API access
- ✅ Better performance
- ❌ Complex native compilation
- ❌ Platform-specific builds

**Option C**: Apache Arrow + Spark
- ✅ Efficient data transfer
- ✅ Industry standard
- ❌ More dependencies
- ❌ Complex setup

**Recommendation**: Start with Option A (child process), migrate to Option B/C if needed.

---

## Implementation Timeline

### Week 1: Infrastructure
- [ ] Update Dockerfile with Spark + Java
- [ ] Create SparkSessionManager
- [ ] Test basic Spark SQL queries
- [ ] Verify local mode works

### Week 2: Read-Only Services
- [ ] Implement SparkMySQLDataService (read-only)
- [ ] Implement SparkParquetDataService (read-only)
- [ ] Implement SparkDeltaDataService (read-only)
- [ ] Update ServiceManager with dual mode

### Week 3: Configuration & UI
- [ ] Update storage configuration model
- [ ] Update API routes for access method switching
- [ ] Update frontend Configuration page
- [ ] Add UI toggle for access method

### Week 4: Testing & Documentation
- [ ] Test all combinations (3 storage × 2 access methods)
- [ ] Performance benchmarking
- [ ] Document SparkSession configuration
- [ ] Add monitoring/logging

---

## Success Criteria

✅ **Must Have:**
1. SparkSession runs in local mode (no cluster)
2. Can read from MySQL via JDBC
3. Can read from Parquet files
4. Can read from Delta tables
5. UI allows switching between direct/sparksession
6. All three storage modes work with SparkSession

✅ **Nice to Have:**
1. Write operations via SparkSession
2. Query optimization metrics
3. Spark UI accessible at localhost:4040
4. Performance comparison dashboard

---

## Next Steps

1. **Confirm approach**: Does this plan match your vision?
2. **Choose Node-Spark bridge**: Child process or node-java?
3. **Start with**: MySQL SparkSession service first (simplest to test)
4. **Iterate**: Get one working, then expand to others

**Ready to proceed?** Let me know and I'll start implementing!
