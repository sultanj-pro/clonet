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
    }
};
