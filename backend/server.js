const express = require('express');
const { swaggerUi, swaggerSpec } = require('./swagger');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes and services
const userRoutes = require('./routes/users');
// Note: Ensure that 'user' is consistently referred to as 'username' in the userRoutes
const configRoutes = require('./routes/config');
const cloneRoutes = require('./routes/clone');
const jdbcConfigRoutes = require('./routes/jdbcConfig');
const connectionsRoutes = require('./routes/connections');
const { initializeService } = require('./services/serviceManager');

// Middleware
// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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
app.use('/api/clone', cloneRoutes);
app.use('/api/jdbc', jdbcConfigRoutes);
app.use('/api/connections', connectionsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Backend is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// Initialize data service before starting server
initializeService().then(() => {
  if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }).on('error', (error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
  }
}).catch(error => {
  console.error('Failed to initialize data service:', error);
  process.exit(1);
});