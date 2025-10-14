const fs = require('fs').promises;
const path = require('path');

const PARQUET_DIR = path.join(__dirname, '..', 'data', 'parquet');

// Ensure parquet directory exists
const initialize = async () => {
  try {
    await fs.mkdir(PARQUET_DIR, { recursive: true });
    console.log('Parquet storage initialized');
  } catch (error) {
    console.error('Error initializing parquet storage:', error);
    throw error;
  }
};

const getUsers = async () => {
  try {
    const filePath = path.join(PARQUET_DIR, 'users.json');
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // If file doesn't exist, return empty array
        return [];
      }
      throw err;
    }
  } catch (error) {
    console.error('Error fetching users from parquet:', error);
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const users = await getUsers();
    return users.find(user => user.id === id);
  } catch (error) {
    console.error('Error fetching user by ID from parquet:', error);
    throw error;
  }
};

const createUser = async (userData) => {
  try {
    const users = await getUsers();
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      ...userData
    };
    users.push(newUser);
    await fs.writeFile(
      path.join(PARQUET_DIR, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    return newUser;
  } catch (error) {
    console.error('Error creating user in parquet:', error);
    throw error;
  }
};

const updateUser = async (id, userData) => {
  try {
    const users = await getUsers();
    const index = users.findIndex(user => user.id === id);
    if (index === -1) {
      throw new Error('User not found');
    }
    const updatedUser = { ...users[index], ...userData };
    users[index] = updatedUser;
    await fs.writeFile(
      path.join(PARQUET_DIR, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    return updatedUser;
  } catch (error) {
    console.error('Error updating user in parquet:', error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    const users = await getUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    await fs.writeFile(
      path.join(PARQUET_DIR, 'users.json'),
      JSON.stringify(filteredUsers, null, 2)
    );
    return { id };
  } catch (error) {
    console.error('Error deleting user from parquet:', error);
    throw error;
  }
};

module.exports = {
  initialize,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
        email: row.email,
        role: row.role
      }));
    } catch (error) {
      if (error.message.includes('Path does not exist')) {
        // If no parquet file exists yet, return empty array
        return [];
      }
      throw error;
    }
  }

  async getUserById(id) {
    const df = await this.spark.read().parquet(this.userParquetPath);
    const user = await df.filter(`id = ${id}`).collect();
    return user.length > 0 ? {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      role: user[0].role
    } : null;
  }

  async createUser(userData) {
    const existingUsers = await this.getAllUsers();
    const newId = existingUsers.length > 0 
      ? Math.max(...existingUsers.map(u => u.id)) + 1 
      : 1;

    const newUser = {
      id: newId,
      ...userData
    };

    const allUsers = [...existingUsers, newUser];
    
    // Create DataFrame from all users
    const df = this.spark.createDataFrame([allUsers]);
    
    // Write to Parquet file, overwriting existing data
    await df.write()
      .mode('overwrite')
      .parquet(this.userParquetPath);

    return newUser;
  }

  async updateUser(id, userData) {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...users[userIndex],
      ...userData,
      id // Ensure ID remains unchanged
    };

    users[userIndex] = updatedUser;

    // Create DataFrame from updated users array
    const df = this.spark.createDataFrame(users);
    
    // Write to Parquet file, overwriting existing data
    await df.write()
      .mode('overwrite')
      .parquet(this.userParquetPath);

    return updatedUser;
  }

  async deleteUser(id) {
    const users = await this.getAllUsers();
    const filteredUsers = users.filter(u => u.id !== id);

    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }

    // Create DataFrame from filtered users array
    const df = this.spark.createDataFrame(filteredUsers);
    
    // Write to Parquet file, overwriting existing data
    await df.write()
      .mode('overwrite')
      .parquet(this.userParquetPath);

    return true;
  }
}

module.exports = new ParquetDataService();