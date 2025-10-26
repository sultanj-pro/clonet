const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clonet API',
      version: '1.0.0',
      description: 'A modern full-stack web application API powered by Apache Spark, Node.js, and MySQL',
      contact: {
        name: 'Clonet Team',
        email: 'support@clonet.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.clonet.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        HealthStatus: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Backend is running successfully!'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            },
            environment: {
              type: 'string',
              example: 'development'
            }
          }
        },
        SparkStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'error'],
              example: 'healthy'
            },
            message: {
              type: 'string',
              example: 'Spark Session is running'
            },
            sparkVersion: {
              type: 'string',
              example: '3.5.0'
            },
            master: {
              type: 'string',
              example: 'spark://spark-master:7077'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'An error occurred'
            },
            error: {
              type: 'string',
              description: 'Detailed error information',
              example: 'Detailed error stack trace'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Analytics',
        description: 'Data analytics and insights'
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};