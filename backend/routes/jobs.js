// Jobs Routes
const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               source_connection_id:
 *                 type: integer
 *               destination_connection_id:
 *                 type: integer
 *               tables:
 *                 type: array
 *                 items:
 *                   type: string
 *               write_mode:
 *                 type: string
 *                 enum: [overwrite, append]
 *               batch_size:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Job created
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.post('/', jobsController.createJob);
router.get('/', jobsController.getJobs);

/**
 * @swagger
 * /api/jobs/test-run:
 *   post:
 *     summary: Test job configuration without running it
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source_connection_id, destination_connection_id, tables]
 *             properties:
 *               source_connection_id:
 *                 type: integer
 *               destination_connection_id:
 *                 type: integer
 *               tables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Test run successful
 */
router.post('/test-run', jobsController.testRun);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 *   delete:
 *     summary: Delete job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Job deleted
 *       404:
 *         description: Job not found
 */
router.get('/:id', jobsController.getJobById);
router.delete('/:id', jobsController.deleteJob);

module.exports = router;
