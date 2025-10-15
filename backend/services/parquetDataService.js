const path = require('path');
const fs = require('fs').promises;

class ParquetDataService {
  constructor() {
    this.tableName = 'users';
    this.initialized = false;
  }

  async initializeService() {
    // Always reset initialization state
    this.initialized = false;
    
    try {
      console.log('Starting ParquetDataService initialization...');
      
      // Initialize empty data file if it doesn't exist
      const dataPath = path.join('/app/data/parquet', this.tableName, 'data.json');
      try {
        await fs.access(dataPath);
      } catch {
        // File doesn't exist, create it with empty array
        const dirPath = path.join('/app/data/parquet', this.tableName);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(dataPath, JSON.stringify([], null, 2));
      }
      
      this.initialized = true;
      console.log('ParquetDataService initialized successfully with file-based storage');
    } catch (error) {
      console.error('Failed to initialize ParquetDataService:', {
        error: error.message,
        stack: error.stack,
        tableName: this.tableName
      });
      this.initialized = false;
      throw error;
    }
  }

  async _readDataFile() {
    const dataPath = path.join('/app/data/parquet', this.tableName, 'data.json');
    try {
      const content = await fs.readFile(dataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading data file:', error);
      return [];
    }
  }

  async _writeDataFile(data) {
    const dataPath = path.join('/app/data/parquet', this.tableName, 'data.json');
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  }

  async getAllUsers() {
    try {
      const data = await this._readDataFile();
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const data = await this._readDataFile();
      const user = data.find(u => u.id === parseInt(id));
      return user || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const data = await this._readDataFile();
      
      // Get the next ID
      const next_id = data.length > 0 ? Math.max(...data.map(u => u.id)) + 1 : 1;
      const now = new Date().toISOString();
      
      const newUser = {
        id: next_id,
        ...userData,
        created_at: now,
        updated_at: now
      };
      
      data.push(newUser);
      await this._writeDataFile(data);
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
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
      
      const now = new Date().toISOString();
      data[index] = {
        ...data[index],
        ...userData,
        id: parseInt(id), // Ensure ID doesn't change
        updated_at: now
      };
      
      await this._writeDataFile(data);
      return data[index];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const data = await this._readDataFile();
      const filteredData = data.filter(u => u.id !== parseInt(id));
      
      if (data.length === filteredData.length) {
        return { success: false, id };
      }
      
      await this._writeDataFile(filteredData);
      return { success: true, id };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const data = await this._readDataFile();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return data.filter(user =>
        user.name.toLowerCase().includes(lowerSearchTerm) ||
        user.email.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async getPaginatedUsers(limit, offset) {
    try {
      const data = await this._readDataFile();
      return data.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error fetching paginated users:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const data = await this._readDataFile();
      return data.length;
    } catch (error) {
      console.error('Error getting user count:', error);
      throw error;
    }
  }

  // Delta Lake specific features (placeholders for file-based implementation)
  async getTableHistory() {
    return { message: 'Table history not available in file-based mode' };
  }

  async getUsersAsOf(version) {
    return { message: 'Version history not available in file-based mode' };
  }

  async optimize() {
    return { message: 'Optimization not needed for file-based storage' };
  }

  async healthCheck() {
    try {
      const userCount = await this.getUserCount();
      
      return {
        status: 'healthy',
        message: 'ParquetDataService is operational with file-based storage',
        userCount
      };
    } catch (error) {
      return {
        status: 'error',
        message: `ParquetDataService health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }
}

module.exports = ParquetDataService;