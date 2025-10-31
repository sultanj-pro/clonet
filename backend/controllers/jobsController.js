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

            // Validate database types - check EXACT format first
            const validTypes = ['mysql', 'sqlserver'];
            
            if (!validTypes.includes(sourceConnection.type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid source connection type: "${sourceConnection.type}". Must be exactly "mysql" or "sqlserver" (lowercase, no spaces). Please update this connection in the database.`
                });
            }
            
            if (!validTypes.includes(destConnection.type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid destination connection type: "${destConnection.type}". Must be exactly "mysql" or "sqlserver" (lowercase, no spaces). Please update this connection in the database.`
                });
            }
            
            // Types are already validated, no need to normalize
            const sourceNormalizedType = sourceConnection.type;
            const destNormalizedType = destConnection.type;

            // Prepare job data for Spark service
            const jobData = {
                source: {
                    type: sourceNormalizedType,
                    host: sourceConnection.host,
                    port: sourceConnection.port,
                    database: sourceConnection.db_name,
                    username: sourceConnection.username,
                    password: sourceConnection.password,
                    instanceName: sourceConnection.instance_name
                },
                destination: {
                    type: destNormalizedType,
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
            
            const response = await fetch(`${SPARK_SERVICE_URL}/clone/dry-run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });

            const data = await response.json();

            // Check if Spark service returned errors in warnings (even with success=true)
            const hasCriticalErrors = data.validation && Array.isArray(data.validation) && 
                data.validation.some(table => {
                    // Check for login failures, connection errors, or other critical issues
                    if (table.error) return true;
                    if (table.warnings && table.warnings.length > 0) {
                        return table.warnings.some(warning => 
                            warning.includes('Login failed') ||
                            warning.includes('Connection refused') ||
                            warning.includes('not found or not readable') ||
                            warning.includes('Cannot read')
                        );
                    }
                    return false;
                });

            if (!response.ok || hasCriticalErrors) {
                // Build detailed error message from validation results
                let errorMessage = data.message || 'Test run failed';
                
                // If validation results exist, extract specific errors
                if (data.validation && Array.isArray(data.validation)) {
                    const errors = [];
                    data.validation.forEach(table => {
                        if (table.error) {
                            errors.push(`${table.table}: ${table.error}`);
                        }
                        if (table.warnings && table.warnings.length > 0) {
                            // Extract meaningful error from stack trace
                            table.warnings.forEach(warning => {
                                // Extract just the main error message, not full stack trace
                                const match = warning.match(/Login failed for user '[^']+'/i) ||
                                             warning.match(/Connection refused/i) ||
                                             warning.match(/not found or not readable/i);
                                if (match) {
                                    errors.push(`${table.table}: ${match[0]}`);
                                } else if (!warning.includes('\n')) {
                                    // If it's a short warning without stack trace, include it
                                    errors.push(`${table.table}: ${warning}`);
                                }
                            });
                        }
                    });
                    if (errors.length > 0) {
                        errorMessage = errors.join(' | ');
                    }
                }
                
                // Include overall warnings if present
                if (data.overall && data.overall.warnings && data.overall.warnings.length > 0) {
                    const overallErrors = data.overall.warnings
                        .map(w => {
                            const match = w.match(/Login failed for user '[^']+'/i) ||
                                        w.match(/Connection refused/i) ||
                                        w.match(/not found or not readable/i);
                            return match ? match[0] : w.split('\n')[0];
                        })
                        .filter(w => w && w.trim().length > 0);
                    if (overallErrors.length > 0) {
                        errorMessage = overallErrors.join('; ');
                    }
                }
                
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                    data  // Include full validation data for frontend
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
