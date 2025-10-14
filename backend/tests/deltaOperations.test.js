const spark = require('../config/sparkSessionManager');
const assert = require('assert');

describe('Delta Lake CRUD Operations', () => {
    const testTableName = 'test_crud';
    
    before(async () => {
        await spark.initialize();
        // Create test table
        await spark.executeSparkSQL(
            `CREATE TABLE IF NOT EXISTS ${testTableName} (
                id INT,
                name STRING,
                value INT
            ) USING DELTA`
        );
    });

    after(async () => {
        // Clean up test table
        await spark.dropTable(testTableName);
        await spark.stop();
    });

    it('should CREATE new records in Delta table', async () => {
        const testData = [
            { id: 1, name: 'Test 1', value: 100 },
            { id: 2, name: 'Test 2', value: 200 }
        ];
        
        await spark.createTable(testTableName, testData);
        const count = await spark.getRowCount(testTableName);
        assert.strictEqual(count, 2);
    });

    it('should READ records from Delta table', async () => {
        const results = await spark.query(`SELECT * FROM ${testTableName}`);
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].name, 'Test 1');
    });

    it('should UPDATE records in Delta table', async () => {
        await spark.query(`UPDATE ${testTableName} SET value = 150 WHERE id = 1`);
        const result = await spark.query(`SELECT value FROM ${testTableName} WHERE id = 1`);
        assert.strictEqual(result[0].value, 150);
    });

    it('should DELETE records from Delta table', async () => {
        await spark.query(`DELETE FROM ${testTableName} WHERE id = 2`);
        const count = await spark.getRowCount(testTableName);
        assert.strictEqual(count, 1);
    });
});