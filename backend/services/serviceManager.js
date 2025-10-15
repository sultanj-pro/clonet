// Direct access services
const ParquetDataService = require('./parquetDataService');
const DeltaTableDataService = require('./deltaTableDataService.simple');
const MySQLDataService = require('./mysqlDataService');

// SparkSession access services
const SparkMySQLDataService = require('./sparkMySQLDataService');
const SparkParquetDataService = require('./sparkParquetDataService');
const SparkDeltaDataService = require('./sparkDeltaDataService');

const storageConfig = require('../config/storage');

let dataService = null;

const initializeService = async () => {
  try {
    if (!dataService) {
      // Two-dimensional service selection: storageType × accessMethod
      const serviceKey = `${storageConfig.type}-${storageConfig.accessMethod}`;
      
      console.log(`Initializing service: ${storageConfig.getLabel()} (${serviceKey})`);
      
      switch (serviceKey) {
        // MySQL services
        case 'mysql-direct':
          dataService = new MySQLDataService();
          break;
        case 'mysql-sparksession':
          dataService = new SparkMySQLDataService();
          break;
        
        // Parquet services
        case 'parquet-direct':
          dataService = new ParquetDataService();
          break;
        case 'parquet-sparksession':
          dataService = new SparkParquetDataService();
          break;
        
        // Delta services
        case 'delta-direct':
          dataService = new DeltaTableDataService();
          break;
        case 'delta-sparksession':
          dataService = new SparkDeltaDataService();
          break;
        
        default:
          throw new Error(`Unsupported configuration: ${serviceKey}. Storage type: ${storageConfig.type}, Access method: ${storageConfig.accessMethod}`);
      }
      
      await dataService.initializeService();
      console.log(`Data service initialized successfully: ${storageConfig.getLabel()}`);
    }
    return dataService;
  } catch (error) {
    console.error('Error initializing data service:', error);
    throw error;
  }
};

const getDataService = async () => {
  if (!dataService) {
    await initializeService();
  }
  return dataService;
};

const resetService = () => {
  dataService = null;
  console.log('Data service reset - will reinitialize on next request');
};

module.exports = {
  initializeService,
  getDataService,
  resetService
};