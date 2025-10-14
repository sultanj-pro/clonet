const ParquetDataService = require('./parquetDataService');
// const DeltaLakeDataService = require('./deltaLakeDataService'); // Temporarily disabled
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
          dataService = new ParquetDataService();
          break;
        case 'delta':
          console.log('Delta Lake service temporarily disabled - using parquet instead');
          dataService = new ParquetDataService();
          // dataService = new DeltaLakeDataService();
          break;
        default:
          throw new Error(`Unsupported storage type: ${storageConfig.type}`);
      }
      await dataService.initializeService();
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

const resetService = () => {
  dataService = null;
};

module.exports = {
  initializeService,
  getDataService,
  resetService
};