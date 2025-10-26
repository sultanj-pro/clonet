const mssql = require('mssql');

async function ensureAppDatabase(pool) {
  const checkDbQuery = `SELECT name FROM sys.databases WHERE name = 'clonet_app_db'`;
  const createDbQuery = `CREATE DATABASE clonet_app_db`;
  const result = await pool.request().query(checkDbQuery);
  if (result.recordset.length === 0) {
    await pool.request().query(createDbQuery);
  }
}

async function ensureConnectionsTable(pool) {
  const useDbQuery = `USE clonet_app_db`;
  const checkTableQuery = `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'connections')
    CREATE TABLE connections (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL,
      type NVARCHAR(50) NOT NULL,
      host NVARCHAR(255) NOT NULL,
      port INT NOT NULL,
      username NVARCHAR(255) NOT NULL,
      password NVARCHAR(255) NOT NULL,
      database NVARCHAR(255) NOT NULL,
      instanceName NVARCHAR(255)
    )`;
  await pool.request().query(useDbQuery);
  await pool.request().query(checkTableQuery);
}

module.exports = { ensureAppDatabase, ensureConnectionsTable };
// backend/utils/dbSetup.js
// Utility to ensure clonet_app_db and app_settings table exist in SQL Server

const sql = require('mssql');

async function ensureAppDatabaseAndSettingsTable(config) {
  // config: { user, password, server, port }
  // 1. Connect to master DB to check/create clonet_app_db
  const masterConfig = {
    user: config.user,
    password: config.password,
    server: config.server,
    port: config.port || 1433,
    database: 'master',
    options: { encrypt: false, trustServerCertificate: true }
  };
  let pool;
  try {
    pool = await sql.connect(masterConfig);
    // Check if database exists
    const dbCheck = await pool.request().query(`SELECT name FROM sys.databases WHERE name = 'clonet_app_db'`);
    if (dbCheck.recordset.length === 0) {
      await pool.request().query('CREATE DATABASE clonet_app_db');
      console.log('Database clonet_app_db created.');
    } else {
      console.log('Database clonet_app_db already exists.');
    }
    await pool.close();

    // 2. Connect to clonet_app_db to check/create app_settings table
    const appDbConfig = { ...masterConfig, database: 'clonet_app_db' };
    pool = await sql.connect(appDbConfig);
    const tableCheck = await pool.request().query(`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'app_settings'`);
    if (tableCheck.recordset.length === 0) {
      await pool.request().query(`CREATE TABLE app_settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        setting_key NVARCHAR(255) NOT NULL,
        setting_value NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )`);
      console.log('Table app_settings created.');
    } else {
      console.log('Table app_settings already exists.');
    }
    await pool.close();
    return true;
  } catch (err) {
    if (pool) await pool.close();
    console.error('Error ensuring app DB and settings table:', err);
    throw err;
  }
}

module.exports = { ensureAppDatabaseAndSettingsTable };
