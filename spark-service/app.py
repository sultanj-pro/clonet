"""
Spark Service - Persistent SparkSession REST API
Provides a Flask-based REST API for executing Spark SQL queries
using a single, persistent SparkSession.
"""

from flask import Flask, request, jsonify
from pyspark.sql import SparkSession
import time
import logging
import os
from config import SPARK_CONFIG, MYSQL_CONFIG
from clone_service import (
    test_connection,
    get_table_schema,
    clone_data,
    store_job_status,
    get_job_status
)
from database_connectors import get_supported_databases

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global SparkSession (initialized once)
spark = None


def initialize_spark():
    """Initialize the global SparkSession with all configurations"""
    global spark
    
    if spark is not None:
        logger.info("SparkSession already initialized")
        return spark
    
    logger.info("Initializing SparkSession...")
    start_time = time.time()
    
    try:
        builder = SparkSession.builder.appName(SPARK_CONFIG['app_name'])
        
        # Apply all Spark configurations
        for key, value in SPARK_CONFIG['spark_conf'].items():
            builder = builder.config(key, value)
        
        spark = builder.getOrCreate()
        
        # Set log level
        spark.sparkContext.setLogLevel("WARN")
        
        elapsed = time.time() - start_time
        logger.info(f"SparkSession initialized successfully in {elapsed:.2f}s")
        logger.info(f"Spark Version: {spark.version}")
        logger.info(f"Master: {spark.sparkContext.master}")
        
        return spark
        
    except Exception as e:
        logger.error(f"Failed to initialize SparkSession: {str(e)}")
        raise


def execute_mysql_query(sql, config=None):
    """Execute SQL query against MySQL database via JDBC"""
    start_time = time.time()
    
    try:
        # Use provided config or default
        jdbc_config = config if config else MYSQL_CONFIG
        
        # Read from MySQL using JDBC
        df = spark.read.format("jdbc") \
            .option("url", jdbc_config['url']) \
            .option("query", sql) \
            .option("user", jdbc_config['user']) \
            .option("password", jdbc_config['password']) \
            .option("driver", jdbc_config['driver']) \
            .load()
        
        # Convert to pandas for easy JSON serialization
        result = df.toPandas().to_dict('records')
        
        elapsed = time.time() - start_time
        logger.info(f"MySQL query executed in {elapsed:.2f}s, returned {len(result)} rows")
        
        return {
            'success': True,
            'data': result,
            'rowCount': len(result),
            'executionTimeMs': int(elapsed * 1000)
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"MySQL query failed after {elapsed:.2f}s: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'executionTimeMs': int(elapsed * 1000)
        }


def execute_parquet_query(path, sql=None):
    """Execute SQL query against Parquet file"""
    start_time = time.time()
    
    try:
        # Read Parquet file
        df = spark.read.parquet(path)
        
        # If SQL provided, register temp view and execute
        if sql:
            df.createOrReplaceTempView("parquet_data")
            df = spark.sql(sql)
        
        # Convert to pandas for easy JSON serialization
        result = df.toPandas().to_dict('records')
        
        elapsed = time.time() - start_time
        logger.info(f"Parquet query executed in {elapsed:.2f}s, returned {len(result)} rows")
        
        return {
            'success': True,
            'data': result,
            'rowCount': len(result),
            'executionTimeMs': int(elapsed * 1000)
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Parquet query failed after {elapsed:.2f}s: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'executionTimeMs': int(elapsed * 1000)
        }


def execute_delta_query(path, sql=None):
    """Execute SQL query against Delta Lake table"""
    start_time = time.time()
    
    try:
        # Read Delta table
        df = spark.read.format("delta").load(path)
        
        # If SQL provided, register temp view and execute
        if sql:
            df.createOrReplaceTempView("delta_data")
            df = spark.sql(sql)
        
        # Convert to pandas for easy JSON serialization
        result = df.toPandas().to_dict('records')
        
        elapsed = time.time() - start_time
        logger.info(f"Delta query executed in {elapsed:.2f}s, returned {len(result)} rows")
        
        return {
            'success': True,
            'data': result,
            'rowCount': len(result),
            'executionTimeMs': int(elapsed * 1000)
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Delta query failed after {elapsed:.2f}s: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'executionTimeMs': int(elapsed * 1000)
        }


# ===== REST API Endpoints =====

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        if spark is None:
            return jsonify({
                'status': 'initializing',
                'message': 'SparkSession not yet initialized'
            }), 503
        
        # Test Spark is working
        test_df = spark.sql("SELECT 1 as test")
        test_result = test_df.collect()
        
        return jsonify({
            'status': 'healthy',
            'sparkVersion': spark.version,
            'master': spark.sparkContext.master,
            'message': 'Spark service is ready'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


@app.route('/api/spark/query/mysql', methods=['POST'])
def query_mysql():
    """Execute MySQL query"""
    try:
        data = request.get_json()
        sql = data.get('sql')
        config = data.get('config')
        
        if not sql:
            return jsonify({'success': False, 'error': 'SQL query is required'}), 400
        
        logger.info(f"Executing MySQL query: {sql[:100]}...")
        result = execute_mysql_query(sql, config)
        
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /query/mysql endpoint: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/spark/query/parquet', methods=['POST'])
def query_parquet():
    """Execute Parquet query"""
    try:
        data = request.get_json()
        path = data.get('path')
        sql = data.get('sql')
        
        if not path:
            return jsonify({'success': False, 'error': 'Path is required'}), 400
        
        logger.info(f"Executing Parquet query: path={path}, sql={sql[:100] if sql else 'SELECT *'}...")
        result = execute_parquet_query(path, sql)
        
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /query/parquet endpoint: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/spark/query/delta', methods=['POST'])
def query_delta():
    """Execute Delta Lake query"""
    try:
        data = request.get_json()
        path = data.get('path')
        sql = data.get('sql')
        
        if not path:
            return jsonify({'success': False, 'error': 'Path is required'}), 400
        
        logger.info(f"Executing Delta query: path={path}, sql={sql[:100] if sql else 'SELECT *'}...")
        result = execute_delta_query(path, sql)
        
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /query/delta endpoint: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/spark/info', methods=['GET'])
def spark_info():
    """Get Spark session information"""
    try:
        if spark is None:
            return jsonify({'error': 'SparkSession not initialized'}), 503
        
        return jsonify({
            'version': spark.version,
            'master': spark.sparkContext.master,
            'appName': spark.sparkContext.appName,
            'sparkConf': dict(spark.sparkContext.getConf().getAll())
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========== Clone Service Endpoints ==========

@app.route('/clone/test-connection', methods=['POST'])
def test_db_connection():
    """Test database connection and list tables (supports MySQL and SQL Server)"""
    try:
        if spark is None:
            return jsonify({'success': False, 'message': 'SparkSession not initialized'}), 503
        
        data = request.get_json()
        logger.info(f"=== RECEIVED DATA IN /clone/test-connection ===")
        logger.info(f"Raw data: {data}")
        logger.info(f"Type field: {data.get('type', 'NOT_SET')}")
        
        db_type = data.get('type', 'mysql')
        
        # Validate database type
        if db_type not in get_supported_databases():
            return jsonify({
                'success': False,
                'message': f'Unsupported database type: {db_type}. Supported types: {get_supported_databases()}'
            }), 400
        
        # Validate required fields
        required_fields = ['host', 'database', 'username']
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Set default port if not provided
        if 'port' not in data:
            from database_connectors import get_default_port
            data['port'] = get_default_port(db_type)
        
        logger.info(f"Testing {db_type} connection to {data['host']}:{data['port']}/{data['database']}")
        result = test_connection(spark, data)
        
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /clone/test-connection endpoint: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# Keep backward compatibility
@app.route('/clone/test-mysql', methods=['POST'])
def test_mysql():
    """Legacy endpoint - redirects to test-connection"""
    data = request.get_json()
    data['type'] = 'mysql'
    request._cached_json = (data, data)
    return test_db_connection()


@app.route('/clone/get-schema', methods=['POST'])
def get_schema():
    """Get schema for a database table (supports MySQL and SQL Server)"""
    try:
        if spark is None:
            return jsonify({'success': False, 'message': 'SparkSession not initialized'}), 503
        
        data = request.get_json()
        table = data.get('table')
        
        if not table:
            return jsonify({
                'success': False,
                'message': 'Missing required field: table'
            }), 400
        
        # Validate required fields for connection
        required_fields = ['host', 'database', 'username']
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        logger.info(f"Getting schema for {data.get('type', 'mysql')} {data['host']}/{data['database']}.{table}")
        result = get_table_schema(spark, data, table)
        
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /clone/get-schema endpoint: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/clone/execute', methods=['POST'])
def execute_clone():
    """Execute clone operation from source to destination (supports MySQL and SQL Server)"""
    try:
        if spark is None:
            return jsonify({'success': False, 'message': 'SparkSession not initialized'}), 503
        
        data = request.get_json()
        source = data.get('source')
        destination = data.get('destination')
        options = data.get('options', {'mode': 'overwrite', 'batchSize': 10000})
        
        if not source or not destination:
            return jsonify({
                'success': False,
                'message': 'Missing required fields: source, destination'
            }), 400
        
        # Validate source fields
        required_source = ['host', 'database', 'username', 'table']
        if not all(source.get(field) for field in required_source):
            return jsonify({
                'success': False,
                'message': f'Missing required source fields: {required_source}'
            }), 400
        
        # Validate destination fields
        required_dest = ['host', 'database', 'username']
        if not all(destination.get(field) for field in required_dest):
            return jsonify({
                'success': False,
                'message': f'Missing required destination fields: {required_dest}'
            }), 400
        
        source_type = source.get('type', 'mysql')
        dest_type = destination.get('type', 'mysql')
        
        logger.info(f"Starting clone: {source_type} {source['database']}.{source['table']} -> " +
                   f"{dest_type} {destination['database']}.{destination.get('table', source['table'])}")
        
        result = clone_data(spark, source, destination, options)
        
        # Store job status for later retrieval
        if result.get('jobId'):
            store_job_status(result['jobId'], result)
        
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /clone/execute endpoint: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/clone/status/<job_id>', methods=['GET'])
def clone_status(job_id):
    """Get status of a clone job"""
    try:
        logger.info(f"Getting status for job {job_id}")
        result = get_job_status(job_id)
        
        status_code = 200 if result.get('success') is not False else 404
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Error in /clone/status endpoint: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    # Initialize Spark on startup
    logger.info("Starting Spark Service...")
    initialize_spark()
    
    # Start Flask app
    port = int(os.getenv('PORT', 8000))
    logger.info(f"Starting Flask server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
