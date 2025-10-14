const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'clonet_db',
  connectionLimit: 10,
  connectTimeout: 60000,
  waitForConnections: true
};

// Test connection
const testConnection = async () => {
  try {
    const testPool = mysql.createPool(dbConfig);
    const connection = await testPool.getConnection();
    await connection.release();
    await testPool.end();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

// Initialize connection test
testConnection();

module.exports = dbConfig;