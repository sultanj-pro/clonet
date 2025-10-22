const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');

// Get all connections
router.get('/', connectionsController.getConnections);

// Add a new connection
router.post('/', connectionsController.addConnection);

// Update a connection
router.put('/:id', connectionsController.updateConnection);

// Delete a connection
router.delete('/:id', connectionsController.deleteConnection);

module.exports = router;
