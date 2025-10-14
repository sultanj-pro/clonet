const FileDataService = require('./fileDataService');
const MySQLDataService = require('./mysqlDataService');
const storageConfig = require('../config/storage');

let dataService = null;

const initializeService = async () => {
  try {
    if (!dataService) {
      switch (storageConfig.type) {
        case 'mysql':
          dataService = new MySQLDataService();
          break;
        case 'parquet':
          dataService = new FileDataService();
          break;
        default:
          throw new Error(`Unsupported storage type: ${storageConfig.type}`);
      }
      await dataService.initialize();
      console.log(`${storageConfig.type} data service initialized successfully`);
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

module.exports = {
  initializeService,
  getDataService
};