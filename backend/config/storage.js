const path = require('path');

// Storage configuration
const storageConfig = {
  // Two-dimensional configuration: storage type × data access method
  type: process.env.STORAGE_TYPE || 'mysql',  // mysql | parquet | delta
  accessMethod: process.env.DATA_ACCESS_METHOD || 'direct',  // direct | sparksession (sparksession requires Spark installation)
  
  mysql: {
    host: process.env.DB_HOST || 'mysql',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'clonet_user',
    password: process.env.DB_PASSWORD || 'clonet_password',
    database: process.env.DB_NAME || 'clonet_db'
  },
  
  parquet: {
    basePath: process.env.PARQUET_BASE_PATH || path.join(__dirname, '..', 'data', 'parquet')
  },

  delta: {
    basePath: process.env.DELTA_BASE_PATH || path.join(__dirname, '..', 'data', 'delta')
  }
};

/**
 * Validates the storage configuration
 * @returns {object} Validation result with isValid flag and message
 */
storageConfig.validate = function() {
  const validTypes = ['mysql', 'parquet', 'delta'];
  const validAccessMethods = ['direct', 'sparksession'];

  if (!validTypes.includes(this.type)) {
    return {
      isValid: false,
      message: `Invalid storage type: ${this.type}. Must be one of: ${validTypes.join(', ')}`
    };
  }

  if (!validAccessMethods.includes(this.accessMethod)) {
    return {
      isValid: false,
      message: `Invalid access method: ${this.accessMethod}. Must be one of: ${validAccessMethods.join(', ')}`
    };
  }

  return { isValid: true, message: 'Configuration is valid' };
};

/**
 * Gets a descriptive label for the current configuration
 * @returns {string} Human-readable configuration description
 */
storageConfig.getLabel = function() {
  const typeLabels = {
    mysql: 'MySQL Database',
    parquet: 'Parquet Files',
    delta: 'Delta Lake'
  };
  
  const accessLabels = {
    direct: 'Direct Access',
    sparksession: 'SparkSession'
  };

  return `${typeLabels[this.type] || this.type} via ${accessLabels[this.accessMethod] || this.accessMethod}`;
};

module.exports = storageConfig;