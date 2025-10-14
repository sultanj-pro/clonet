const path = require('path');

/**
 * Simple Delta Table Format Data Service
 * Uses JSON files in /app/data/delta directory
 * This is a temporary implementation until parquetjs is properly installed
 * for the full Delta Table Format with Parquet files and transaction logs
 */
class DeltaTableDataService {
  constructor() {
    this.tableName = 'users';
    this.initialized = false;
  }

  async initializeService() {
    this.initialized = false;
    
    try {
      console.log('Initializing Delta Table Format service (simple mode)...');
      
      // For file-based storage, initialize empty data file
      const dataPath = path.join('/app/data/delta', this.tableName, 'data.json');
      const fs = require('fs').promises;
      try {
        await fs.access(dataPath);
      } catch {
        // File doesn't exist, create it with empty array
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        await fs.writeFile(dataPath, JSON.stringify([], null, 2));
      }
      
      this.initialized = true;
      console.log('Delta Table Format service initialized successfully');
    } catch (error) {
      console.error('Error initializing Delta Table Format service:', error);
      throw error;
    }
  }

  async _readDataFile() {
    const dataPath = path.join('/app/data/delta', this.tableName, 'data.json');
    const fs = require('fs').promises;
    try {
      const content = await fs.readFile(dataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading data file:', error);
      return [];
    }
  }

  async _writeDataFile(data) {
    const dataPath = path.join('/app/data/delta', this.tableName, 'data.json');
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  }

  async getAllUsers() {
    try {
      const data = await this._readDataFile();
      return data;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const data = await this._readDataFile();
      const user = data.find(u => u.id === parseInt(id));
      return user || null;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const data = await this._readDataFile();
      const newUser = {
        id: data.length > 0 ? Math.max(...data.map(u => u.id)) + 1 : 1,
        name: userData.name,
        email: userData.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.push(newUser);
      await this._writeDataFile(data);
      return newUser;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const data = await this._readDataFile();
      const index = data.findIndex(u => u.id === parseInt(id));
      if (index === -1) {
        return null;
      }
      data[index] = {
        ...data[index],
        ...userData,
        id: parseInt(id),
        updated_at: new Date().toISOString()
      };
      await this._writeDataFile(data);
      return data[index];
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const data = await this._readDataFile();
      const index = data.findIndex(u => u.id === parseInt(id));
      if (index === -1) {
        return false;
      }
      data.splice(index, 1);
      await this._writeDataFile(data);
      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const data = await this._readDataFile();
      if (!searchTerm) {
        return data;
      }
      const term = searchTerm.toLowerCase();
      return data.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error in searchUsers:', error);
      throw error;
    }
  }

  async getPaginatedUsers(page = 1, pageSize = 10) {
    try {
      const data = await this._readDataFile();
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = data.slice(startIndex, endIndex);
      
      return {
        users: paginatedData,
        total: data.length,
        page,
        pageSize,
        totalPages: Math.ceil(data.length / pageSize)
      };
    } catch (error) {
      console.error('Error in getPaginatedUsers:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const data = await this._readDataFile();
      return data.length;
    } catch (error) {
      console.error('Error in getUserCount:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const dataPath = path.join('/app/data/delta', this.tableName, 'data.json');
      const fs = require('fs').promises;
      await fs.access(dataPath);
      return {
        status: 'healthy',
        message: 'Delta Table Format service is running',
        storageType: 'delta',
        dataPath: dataPath
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        storageType: 'delta'
      };
    }
  }
}

module.exports = DeltaTableDataService;
