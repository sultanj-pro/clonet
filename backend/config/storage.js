const path = require('path');

// Storage configuration
const storageConfig = {
  type: process.env.STORAGE_TYPE || 'mysql',  // Default to MySQL if not specified
  
  mysql: {
    host: process.env.DB_HOST || 'mysql',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'clonet_user',
    password: process.env.DB_PASSWORD || 'clonet_password',
    database: process.env.DB_NAME || 'clonet_db'
  },
  
  parquet: {
    basePath: process.env.PARQUET_BASE_PATH || path.join(__dirname, '..', 'data', 'delta')
  }
};

module.exports = storageConfig;