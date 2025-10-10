const sparkSessionManager = require('../config/sparkSession');

class SparkDataService {
  constructor() {
    this.sparkManager = sparkSessionManager;
  }

  async initializeService() {
    try {
      await this.sparkManager.initialize();
      console.log('SparkDataService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SparkDataService:', error);
      throw error;
    }
  }

  // Users CRUD operations using Spark

  async getAllUsers() {
    try {
      const usersDF = await this.sparkManager.createJDBCDataFrame('users');
      const users = await usersDF.select('id', 'name', 'email', 'created_at').collect();
      return users;
    } catch (error) {
      console.error('Error fetching users with Spark:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const usersDF = await this.sparkManager.createJDBCDataFrame('users');
      const userDF = usersDF.filter(`id = ${userId}`);
      const users = await userDF.select('id', 'name', 'email', 'created_at').collect();
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error fetching user by ID with Spark:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const spark = this.sparkManager.getSession();
      const { name, email } = userData;
      
      // Create a DataFrame with the new user data
      const newUserData = [{
        name: name,
        email: email,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }];
      
      const newUserDF = spark.createDataFrame(newUserData);
      
      // Write to database
      await this.sparkManager.writeJDBCDataFrame(newUserDF, 'users', 'append');
      
      // Return the created user (get the last inserted user by email)
      const createdUserDF = await this.sparkManager.createJDBCDataFrame('users');
      const userDF = createdUserDF.filter(`email = '${email}'`).orderBy('id desc').limit(1);
      const users = await userDF.collect();
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error creating user with Spark:', error);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      const { name, email } = userData;
      
      // For updates, we'll use SQL through Spark
      const updateQuery = `
        UPDATE users 
        SET name = '${name}', email = '${email}', updated_at = NOW() 
        WHERE id = ${userId}
      `;
      
      await this.sparkManager.executeSQL(updateQuery);
      
      // Return the updated user
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user with Spark:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      // For deletes, we'll use SQL through Spark
      const deleteQuery = `DELETE FROM users WHERE id = ${userId}`;
      await this.sparkManager.executeSQL(deleteQuery);
      
      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user with Spark:', error);
      throw error;
    }
  }

  // Advanced Spark operations

  async getUsersAnalytics() {
    try {
      const usersDF = await this.sparkManager.createJDBCDataFrame('users');
      
      // Create temporary view for SQL operations
      await usersDF.createOrReplaceTempView('users_view');
      
      // Perform analytics queries
      const totalUsersDF = await this.sparkManager.executeSQL('SELECT COUNT(*) as total_users FROM users_view');
      const usersByDomainDF = await this.sparkManager.executeSQL(`
        SELECT 
          SUBSTRING_INDEX(email, '@', -1) as domain,
          COUNT(*) as user_count
        FROM users_view 
        GROUP BY SUBSTRING_INDEX(email, '@', -1)
        ORDER BY user_count DESC
      `);
      
      const recentUsersDF = await this.sparkManager.executeSQL(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users_view 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      const [totalUsers, usersByDomain, recentUsers] = await Promise.all([
        totalUsersDF.collect(),
        usersByDomainDF.collect(),
        recentUsersDF.collect()
      ]);

      return {
        totalUsers: totalUsers[0]?.total_users || 0,
        usersByDomain: usersByDomain,
        recentUserTrends: recentUsers
      };
    } catch (error) {
      console.error('Error performing user analytics with Spark:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const usersDF = await this.sparkManager.createJDBCDataFrame('users');
      
      const searchDF = usersDF.filter(
        `name LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'`
      );
      
      const results = await searchDF.select('id', 'name', 'email', 'created_at').collect();
      return results;
    } catch (error) {
      console.error('Error searching users with Spark:', error);
      throw error;
    }
  }

  async getUsersPaginated(page = 1, pageSize = 10) {
    try {
      const usersDF = await this.sparkManager.createJDBCDataFrame('users');
      
      // Calculate offset
      const offset = (page - 1) * pageSize;
      
      // Get total count
      const totalCount = await usersDF.count();
      
      // Get paginated results
      const paginatedDF = usersDF
        .select('id', 'name', 'email', 'created_at')
        .orderBy('id')
        .limit(pageSize)
        .offset(offset);
      
      const users = await paginatedDF.collect();
      
      return {
        users: users,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    } catch (error) {
      console.error('Error fetching paginated users with Spark:', error);
      throw error;
    }
  }

  // Health check for the service
  async healthCheck() {
    try {
      const sparkHealth = await this.sparkManager.healthCheck();
      
      if (sparkHealth.status === 'healthy') {
        // Test database connectivity through Spark
        const testDF = await this.sparkManager.createJDBCDataFrame('users');
        const count = await testDF.count();
        
        return {
          status: 'healthy',
          message: 'SparkDataService is operational',
          sparkInfo: sparkHealth,
          userCount: count
        };
      } else {
        return {
          status: 'error',
          message: 'Spark Session is not healthy',
          sparkInfo: sparkHealth
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `SparkDataService health check failed: ${error.message}`
      };
    }
  }

  async shutdown() {
    try {
      await this.sparkManager.stop();
      console.log('SparkDataService shutdown completed');
    } catch (error) {
      console.error('Error during SparkDataService shutdown:', error);
    }
  }
}

// Singleton instance
const sparkDataService = new SparkDataService();

module.exports = sparkDataService;