const express = require('express');
const router = express.Router();
const storageConfig = require('../config/storage');
const { getDataService } = require('../services/serviceManager');

// Getting data service is now handled by serviceManager

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users with optional pagination and search
 *     description: Retrieve all users from the database using Apache Spark. Supports pagination and search functionality.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter users by name or email
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 - $ref: '#/components/schemas/PaginatedUsers'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET all users
router.get('/', async (req, res) => {
  try {
    const { page, pageSize, search } = req.query;
    
    const dataService = await getDataService();

    if (search) {
      const users = await dataService.searchUsers(search);
      res.json(users);
    } else if (page && pageSize) {
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);
      
      const total = await dataService.getUserCount();
      const users = await dataService.getPaginatedUsers(limit, offset);
      
      res.json({
        users,
        pagination: {
          currentPage: parseInt(page),
          pageSize: limit,
          totalCount: total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      const users = await dataService.getAllUsers();
      res.json(users);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Error fetching users', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their unique identifier using Apache Spark.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const dataService = await getDataService();
    const user = await dataService.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      message: 'Error fetching user', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user by ID
 *     description: Delete a specific user from the database by their unique identifier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User successfully deleted
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const dataService = await getDataService();
    const result = await dataService.deleteUser(parseInt(id, 10));
    if (!result) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json({ message: 'User deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Error deleting user', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Create a new user in the database using Apache Spark.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// POST create new user
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    const dataService = await getDataService();
    const newUser = await dataService.createUser({ 
      name, 
      email,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Error creating user', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update an existing user
 *     description: Update user information using Apache Spark.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    const dataService = await getDataService();
    const id = parseInt(req.params.id, 10);
    
    // First check if the user exists
    const existingUser = await dataService.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update the user
    const updatedUser = await dataService.updateUser(id, {
      name,
      email,
      updated_at: new Date()
    });
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      message: 'Error updating user', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     description: Remove a user from the database using Apache Spark.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    await sparkDataService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Error deleting user', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/users/analytics/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Get user analytics and insights
 *     description: Retrieve comprehensive analytics about users including total count, domain distribution, and recent trends using Apache Spark.
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAnalytics'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET user analytics (new endpoint)
router.get('/analytics/summary', async (req, res) => {
  try {
    const analytics = await sparkDataService.getUsersAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching user analytics', 
      error: error.message 
    });
  }
});

module.exports = router;