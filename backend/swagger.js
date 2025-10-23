const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clonet API',
      version: '1.0.0',
      description: 'API documentation for Clonet backend',
    },
    servers: [
      { url: 'http://localhost:5000' }
    ],
  },
  apis: ['./backend/routes/*.js', './backend/controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
