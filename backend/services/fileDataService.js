const fs = require('fs').promises;
const path = require('path');

class FileDataService {
  constructor() {
    this.dataPath = path.join(__dirname, '..', 'data');
    this.usersFile = path.join(this.dataPath, 'users.json');
  }

  async initializeService() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      
      try {
        await fs.access(this.usersFile);
      } catch {
        // If users.json doesn't exist, create it with empty array
        await fs.writeFile(this.usersFile, '[]');
      }
      
      console.log('FileDataService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FileDataService:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.id === parseInt(userId)) || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const users = await this.getAllUsers();
      const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        ...userData,
        created_at: new Date().toISOString()
      };
      
      users.push(newUser);
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      const users = await this.getAllUsers();
      const index = users.findIndex(user => user.id === parseInt(userId));
      
      if (index === -1) {
        return null;
      }
      
      const updatedUser = {
        ...users[index],
        ...userData,
        id: users[index].id // Preserve the original ID
      };
      
      users[index] = updatedUser;
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const users = await this.getAllUsers();
      const filteredUsers = users.filter(user => user.id !== parseInt(userId));
      
      if (filteredUsers.length === users.length) {
        return false; // No user was deleted
      }
      
      await fs.writeFile(this.usersFile, JSON.stringify(filteredUsers, null, 2));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const users = await this.getAllUsers();
      const term = searchTerm.toLowerCase();
      
      return users.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching users:', error);
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

  async getPaginatedUsers(limit, offset) {
    try {
      const users = await this.getAllUsers();
      return users.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting paginated users:', error);
      throw error;
    }
  }
}

module.exports = FileDataService;