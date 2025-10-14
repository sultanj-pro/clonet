const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { swaggerUi, specs } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const userRoutes = require('./routes/users');
const configRoutes = require('./routes/config');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Configure CORS
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add pre-flight OPTIONS handling
app.options('*', cors());

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/config', configRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Clonet API Documentation"
}));

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Backend health check
 *     description: Check if the backend service is running and responsive.
 *     responses:
 *       200:
 *         description: Backend is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Backend is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /api/spark-status:
 *   get:
 *     tags: [Health]
 *     summary: Apache Spark cluster status
 *     description: Check the health and status of the Apache Spark cluster integration.
 *     responses:
 *       200:
 *         description: Spark status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SparkStatus'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Spark health check
app.get('/api/spark-status', async (req, res) => {
  try {
    const sparkHealth = await sparkDataService.healthCheck();
    res.json(sparkHealth);
  } catch (error) {
    console.error('Spark health check error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Spark health check failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/db-status:
 *   get:
 *     tags: [Health]
 *     summary: Database connection status
 *     description: Check the connection status to the MySQL database.
 *     responses:
 *       200:
 *         description: Database connection is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Database connection successful
 *                 status:
 *                   type: string
 *                   example: connected
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Database connection test
app.get('/api/db-status', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.execute('SELECT 1');
    res.json({ 
      message: 'Database connection successful',
      status: 'connected'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      status: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// Sample API routes (legacy - for backward compatibility)
app.get('/api/users-legacy', (req, res) => {
  // This would typically fetch from database directly (legacy method)
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Swagger documentation: http://localhost:${PORT}/api-docs`);
});