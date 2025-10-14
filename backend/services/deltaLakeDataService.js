const path = require('path');
const fs = require('fs').promises;
const parquet = require('parquetjs');

class DeltaLakeDataService {
  constructor() {
    this.tableName = 'users';
    this.deltaBasePath = path.join('/app/data/delta', this.tableName);
    this.deltaLogPath = path.join(this.deltaBasePath, '_delta_log');
    this.version = 0;
    this.initialized = false;
    
    // Define the schema for Parquet files
    this.parquetSchema = new parquet.ParquetSchema({
      id: { type: 'INT64' },
      name: { type: 'UTF8' },
      email: { type: 'UTF8' },
      created_at: { type: 'TIMESTAMP_MILLIS' },
      updated_at: { type: 'TIMESTAMP_MILLIS' }
    });
  }

  async initializeService() {
    try {
      console.log('Initializing Delta Lake storage...');
      
      // Create Delta Lake directory structure
      await fs.mkdir(this.deltaBasePath, { recursive: true });
      await fs.mkdir(this.deltaLogPath, { recursive: true });
      
      // Check if table already exists by looking for transaction log
      const logFiles = await this._getTransactionLogFiles();
      
      if (logFiles.length === 0) {
        // Initialize new Delta table
        await this._writeTransactionLog({
          protocol: { minReaderVersion: 1, minWriterVersion: 2 },
          metaData: {
            id: this._generateId(),
            name: this.tableName,
            description: 'Users table',
            format: { provider: 'parquet', options: {} },
            schemaString: JSON.stringify(this._getSchemaDefinition()),
            partitionColumns: [],
            createdTime: Date.now()
          }
        });
        
        console.log('Delta Lake table initialized');
      } else {
        // Load existing version
        this.version = logFiles.length - 1;
        console.log(`Delta Lake table loaded at version ${this.version}`);
      }
      
      this.initialized = true;
      console.log('DeltaLakeDataService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DeltaLakeDataService:', error);
      this.initialized = false;
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const snapshot = await this._getCurrentSnapshot();
      const users = [];
      
      for (const file of snapshot.addFiles) {
        const filePath = path.join(this.deltaBasePath, file.path);
        const fileUsers = await this._readParquetFile(filePath);
        users.push(...fileUsers);
      }
      
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async getUserById(id) {
    try {
      const users = await this.getAllUsers();
      return users.find(u => u.id === parseInt(id)) || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const users = await this.getAllUsers();
      const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const now = new Date();
      
      const newUser = {
        id: nextId,
        name: userData.name,
        email: userData.email,
        created_at: now,
        updated_at: now
      };
      
      // Write new Parquet file
      const fileName = `part-${this._generateId()}.parquet`;
      const filePath = path.join(this.deltaBasePath, fileName);
      await this._writeParquetFile(filePath, [newUser]);
      
      // Add transaction log entry
      await this._writeTransactionLog({
        add: {
          path: fileName,
          partitionValues: {},
          size: (await fs.stat(filePath)).size,
          modificationTime: Date.now(),
          dataChange: true,
          stats: JSON.stringify({
            numRecords: 1,
            minValues: { id: nextId },
            maxValues: { id: nextId }
          })
        }
      });
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === parseInt(id));
      
      if (userIndex === -1) {
        return null;
      }
      
      const now = new Date();
      users[userIndex] = {
        ...users[userIndex],
        ...userData,
        id: parseInt(id),
        updated_at: now
      };
      
      // Rewrite all data (simplified - real Delta Lake would use merge)
      const fileName = `part-${this._generateId()}.parquet`;
      const filePath = path.join(this.deltaBasePath, fileName);
      await this._writeParquetFile(filePath, users);
      
      // Mark old files as removed and add new file
      const snapshot = await this._getCurrentSnapshot();
      for (const file of snapshot.addFiles) {
        await this._writeTransactionLog({
          remove: {
            path: file.path,
            deletionTimestamp: Date.now(),
            dataChange: true
          }
        });
      }
      
      await this._writeTransactionLog({
        add: {
          path: fileName,
          partitionValues: {},
          size: (await fs.stat(filePath)).size,
          modificationTime: Date.now(),
          dataChange: true,
          stats: JSON.stringify({
            numRecords: users.length,
            minValues: { id: Math.min(...users.map(u => u.id)) },
            maxValues: { id: Math.max(...users.map(u => u.id)) }
          })
        }
      });
      
      return users[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const users = await this.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== parseInt(id));
      
      if (users.length === filteredUsers.length) {
        return { success: false, id };
      }
      
      // Rewrite all data without the deleted user
      const fileName = `part-${this._generateId()}.parquet`;
      const filePath = path.join(this.deltaBasePath, fileName);
      await this._writeParquetFile(filePath, filteredUsers);
      
      // Mark old files as removed and add new file
      const snapshot = await this._getCurrentSnapshot();
      for (const file of snapshot.addFiles) {
        await this._writeTransactionLog({
          remove: {
            path: file.path,
            deletionTimestamp: Date.now(),
            dataChange: true
          }
        });
      }
      
      await this._writeTransactionLog({
        add: {
          path: fileName,
          partitionValues: {},
          size: (await fs.stat(filePath)).size,
          modificationTime: Date.now(),
          dataChange: true,
          stats: JSON.stringify({
            numRecords: filteredUsers.length,
            minValues: filteredUsers.length > 0 ? { id: Math.min(...filteredUsers.map(u => u.id)) } : {},
            maxValues: filteredUsers.length > 0 ? { id: Math.max(...filteredUsers.map(u => u.id)) } : {}
          })
        }
      });
      
      return { success: true, id };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const users = await this.getAllUsers();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return users.filter(user =>
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
      const users = await this.getAllUsers();
      return users.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error fetching paginated users:', error);
      throw error;
    }
  }

  async getUserCount() {
    try {
      const users = await this.getAllUsers();
      return users.length;
    } catch (error) {
      console.error('Error getting user count:', error);
      throw error;
    }
  }

  // Delta Lake specific features
  async getTableHistory() {
    try {
      const logFiles = await this._getTransactionLogFiles();
      const history = [];
      
      for (let i = 0; i < logFiles.length; i++) {
        const logPath = path.join(this.deltaLogPath, logFiles[i]);
        const content = await fs.readFile(logPath, 'utf8');
        const entries = content.trim().split('\n').map(line => JSON.parse(line));
        
        history.push({
          version: i,
          timestamp: entries[0].metaData?.createdTime || entries[0].add?.modificationTime || Date.now(),
          operations: entries.length
        });
      }
      
      return history;
    } catch (error) {
      console.error('Error getting table history:', error);
      return [];
    }
  }

  async getUsersAsOf(version) {
    try {
      const snapshot = await this._getSnapshotAtVersion(version);
      const users = [];
      
      for (const file of snapshot.addFiles) {
        const filePath = path.join(this.deltaBasePath, file.path);
        try {
          const fileUsers = await this._readParquetFile(filePath);
          users.push(...fileUsers);
        } catch (err) {
          console.warn(`File ${file.path} not found, skipping`);
        }
      }
      
      return users;
    } catch (error) {
      console.error('Error getting users as of version:', error);
      throw error;
    }
  }

  async optimize() {
    try {
      // Compact all Parquet files into one
      const users = await this.getAllUsers();
      
      if (users.length === 0) {
        return { message: 'No data to optimize' };
      }
      
      const fileName = `part-optimized-${this._generateId()}.parquet`;
      const filePath = path.join(this.deltaBasePath, fileName);
      await this._writeParquetFile(filePath, users);
      
      // Mark old files as removed
      const snapshot = await this._getCurrentSnapshot();
      for (const file of snapshot.addFiles) {
        await this._writeTransactionLog({
          remove: {
            path: file.path,
            deletionTimestamp: Date.now(),
            dataChange: false
          }
        });
      }
      
      // Add optimized file
      await this._writeTransactionLog({
        add: {
          path: fileName,
          partitionValues: {},
          size: (await fs.stat(filePath)).size,
          modificationTime: Date.now(),
          dataChange: false,
          stats: JSON.stringify({
            numRecords: users.length,
            minValues: { id: Math.min(...users.map(u => u.id)) },
            maxValues: { id: Math.max(...users.map(u => u.id)) }
          })
        }
      });
      
      return { message: 'Table optimized successfully', filesCompacted: snapshot.addFiles.length };
    } catch (error) {
      console.error('Error optimizing table:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'error',
          message: 'Delta Lake not initialized'
        };
      }
      
      const userCount = await this.getUserCount();
      
      return {
        status: 'healthy',
        message: 'DeltaLakeDataService is operational',
        version: this.version,
        userCount
      };
    } catch (error) {
      return {
        status: 'error',
        message: `DeltaLakeDataService health check failed: ${error.message}`,
        error: error.stack
      };
    }
  }

  // Private helper methods
  _getSchemaDefinition() {
    return {
      type: 'struct',
      fields: [
        { name: 'id', type: 'long', nullable: false, metadata: {} },
        { name: 'name', type: 'string', nullable: false, metadata: {} },
        { name: 'email', type: 'string', nullable: false, metadata: {} },
        { name: 'created_at', type: 'timestamp', nullable: false, metadata: {} },
        { name: 'updated_at', type: 'timestamp', nullable: false, metadata: {} }
      ]
    };
  }

  async _writeParquetFile(filePath, data) {
    const writer = await parquet.ParquetWriter.openFile(this.parquetSchema, filePath);
    
    for (const row of data) {
      await writer.appendRow({
        id: row.id,
        name: row.name,
        email: row.email,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at)
      });
    }
    
    await writer.close();
  }

  async _readParquetFile(filePath) {
    const reader = await parquet.ParquetReader.openFile(filePath);
    const cursor = reader.getCursor();
    const users = [];
    
    let record = null;
    while (record = await cursor.next()) {
      users.push({
        id: Number(record.id),
        name: record.name,
        email: record.email,
        created_at: new Date(record.created_at).toISOString(),
        updated_at: new Date(record.updated_at).toISOString()
      });
    }
    
    await reader.close();
    return users;
  }

  async _writeTransactionLog(entry) {
    this.version++;
    const logFile = path.join(this.deltaLogPath, `${String(this.version).padStart(20, '0')}.json`);
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  }

  async _getTransactionLogFiles() {
    try {
      const files = await fs.readdir(this.deltaLogPath);
      return files.filter(f => f.endsWith('.json')).sort();
    } catch (error) {
      return [];
    }
  }

  async _getCurrentSnapshot() {
    return await this._getSnapshotAtVersion(this.version);
  }

  async _getSnapshotAtVersion(version) {
    const snapshot = {
      addFiles: [],
      removeFiles: []
    };
    
    const logFiles = await this._getTransactionLogFiles();
    
    for (let i = 0; i <= version && i < logFiles.length; i++) {
      const logPath = path.join(this.deltaLogPath, logFiles[i]);
      const content = await fs.readFile(logPath, 'utf8');
      const entries = content.trim().split('\n').map(line => JSON.parse(line));
      
      for (const entry of entries) {
        if (entry.add) {
          snapshot.addFiles.push(entry.add);
          snapshot.removeFiles = snapshot.removeFiles.filter(f => f.path !== entry.add.path);
        } else if (entry.remove) {
          snapshot.removeFiles.push(entry.remove);
          snapshot.addFiles = snapshot.addFiles.filter(f => f.path !== entry.remove.path);
        }
      }
    }
    
    return snapshot;
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = DeltaLakeDataService;
