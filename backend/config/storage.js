// Storage configuration
const storageConfig = {
  // Can be 'mysql' or 'parquet'
  type: process.env.STORAGE_TYPE || 'mysql',
  
  // MySQL specific configuration
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'users_db'
  },
  
  // Parquet specific configuration
  parquet: {
    basePath: process.env.PARQUET_BASE_PATH || '../data/parquet'
  }
};

module.exports = storageConfig;