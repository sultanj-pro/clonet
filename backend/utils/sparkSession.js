const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const runSparkSQL = async (sql) => {
  try {
    const command = `spark-sql --conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog -e "${sql}"`;
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error('Spark SQL error:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error('Error executing Spark SQL:', error);
    throw error;
  }
};

module.exports = {
  runSparkSQL
};