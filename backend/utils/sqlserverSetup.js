const sql = require('mssql');

/**
 * Ensures the target database and app_settings table exist.
 * @param {Object} config - SQL Server connection config (host, port, user, password)
 * @param {string} dbName - Name of the database to create (e.g., 'clonet_app_db')
 */
async function ensureDatabaseAndSettingsTable(config, dbName = 'clonet_app_db') {
  // Connect to the server (not a specific database)
  const serverConfig = {
    user: config.user,
    password: config.password,
    server: config.host,
    port: config.port || 1433,
    options: {
      encrypt: false, // Set to true if using Azure
      trustServerCertificate: true,
    },
    database: 'master',
    pool: { max: 1, min: 0, idleTimeoutMillis: 30000 },
  };
  let pool;
  try {
    pool = await sql.connect(serverConfig);
    // Check if database exists
    const dbCheck = await pool.request().query(
      `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
         CREATE DATABASE [${dbName}];`
    );
    // Connect to the new/existing database
    await pool.close();
    const dbConfig = { ...serverConfig, database: dbName };
    pool = await sql.connect(dbConfig);
    // Check if app_settings table exists, create if not
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'app_settings')
      CREATE TABLE app_settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        setting_key NVARCHAR(255) NOT NULL,
        setting_value NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      );
    `);
    await pool.close();
    return true;
  } catch (err) {
    if (pool) await pool.close();
    throw err;
  }
}

module.exports = { ensureDatabaseAndSettingsTable };