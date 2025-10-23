/**
 * @swagger
 * /api/connections:
 *   get:
 *     summary: Get all connections
 *     responses:
 *       200:
 *         description: List of connections
 *   post:
 *     summary: Add a new connection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               database:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Connection created
 *
 * /api/connections/{id}:
 *   put:
 *     summary: Update a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               database:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connection updated
 *   delete:
 *     summary: Delete a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Connection deleted
 */
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
