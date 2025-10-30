// Jobs Controller
const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

module.exports = {
    async createJob(req, res) {
        try {
            const { name, description, source_connection_id, destination_connection_id, tables, write_mode, batch_size } = req.body;
            const pool = mysql.createPool(dbConfig);
            const [result] = await pool.query(
                `INSERT INTO jobs (name, description, source_connection_id, destination_connection_id, tables, write_mode, batch_size) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [name, description, source_connection_id, destination_connection_id, JSON.stringify(tables), write_mode, batch_size]
            );
            await pool.end();
            res.status(201).json({ id: result.insertId, ...req.body, status: 'pending', rows_cloned: 0 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getJobs(req, res) {
        try {
            const pool = mysql.createPool(dbConfig);
            const [jobs] = await pool.query('SELECT * FROM jobs');
            await pool.end();
            res.json(jobs);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getJobById(req, res) {
        try {
            const { id } = req.params;
            const pool = mysql.createPool(dbConfig);
            const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [id]);
            await pool.end();
            if (jobs.length === 0) return res.status(404).json({ error: 'Job not found' });
            res.json(jobs[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async deleteJob(req, res) {
        try {
            const { id } = req.params;
            const pool = mysql.createPool(dbConfig);
            await pool.query('DELETE FROM jobs WHERE id = ?', [id]);
            await pool.end();
            res.status(204).end();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async testRun(req, res) {
        try {
            const fetch = require('node-fetch');
            const { source_connection_id, destination_connection_id, tables } = req.body;
            
            // Validate required fields
            if (!source_connection_id || !destination_connection_id || !tables || tables.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: source_connection_id, destination_connection_id, tables'
                });
            }

            // Fetch connections from database
            const pool = mysql.createPool(dbConfig);
            const [sourceRows] = await pool.query('SELECT * FROM connections WHERE id = ?', [source_connection_id]);
            const [destRows] = await pool.query('SELECT * FROM connections WHERE id = ?', [destination_connection_id]);
            await pool.end();

            if (sourceRows.length === 0 || destRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Source or destination connection not found'
                });
            }

            const sourceConnection = sourceRows[0];
            const destConnection = destRows[0];

            // Prepare job data for Spark service
            const jobData = {
                source: {
                    type: sourceConnection.type.toLowerCase().replace(/\s+/g, ''),
                    host: sourceConnection.host,
                    port: sourceConnection.port,
                    database: sourceConnection.db_name,
                    username: sourceConnection.username,
                    password: sourceConnection.password,
                    instanceName: sourceConnection.instance_name
                },
                destination: {
                    type: destConnection.type.toLowerCase().replace(/\s+/g, ''),
                    host: destConnection.host,
                    port: destConnection.port,
                    database: destConnection.db_name,
                    username: destConnection.username,
                    password: destConnection.password,
                    instanceName: destConnection.instance_name
                },
                tables
            };

            // Forward test to Spark service
            const SPARK_SERVICE_URL = process.env.SPARK_SERVICE_URL || 'http://spark-service:8000';
            
            const response = await fetch(`${SPARK_SERVICE_URL}/clone/validate-clone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });

            const data = await response.json();

            if (!response.ok) {
                return res.status(response.status).json({
                    success: false,
                    message: data.message || 'Test run failed'
                });
            }

            res.json({
                success: true,
                message: 'Test run successful',
                data
            });
        } catch (error) {
            console.error('Error in test run:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Test run failed'
            });
        }
    }
};
