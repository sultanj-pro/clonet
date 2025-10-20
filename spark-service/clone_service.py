"""
Clone Service - MySQL to MySQL data cloning using Spark
Handles connection testing, schema retrieval, and data cloning operations
"""

import time
import logging
from pyspark.sql import SparkSession
import uuid

logger = logging.getLogger(__name__)


def build_jdbc_url(host, port, database):
    """Build JDBC URL for MySQL connection"""
    return f"jdbc:mysql://{host}:{port}/{database}?useSSL=false&allowPublicKeyRetrieval=true"


def test_mysql_connection(spark, host, port, database, username, password):
    """
    Test MySQL connection and return list of tables
    
    Args:
        spark: SparkSession instance
        host: MySQL host
        port: MySQL port
        database: Database name
        username: MySQL username
        password: MySQL password
    
    Returns:
        dict: {success: bool, tables: list, message: str}
    """
    try:
        jdbc_url = build_jdbc_url(host, port, database)
        
        logger.info(f"Testing connection to {host}:{port}/{database}")
        
        # Test connection by reading table list
        query = """
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '{}'
        ORDER BY TABLE_NAME
        """.format(database)
        
        df = spark.read.format("jdbc") \
            .option("url", jdbc_url) \
            .option("query", query) \
            .option("user", username) \
            .option("password", password) \
            .option("driver", "com.mysql.cj.jdbc.Driver") \
            .load()
        
        tables = [row['TABLE_NAME'] for row in df.collect()]
        
        logger.info(f"Successfully connected to {host}:{port}/{database}, found {len(tables)} tables")
        
        return {
            'success': True,
            'tables': tables,
            'message': f'Connected successfully. Found {len(tables)} tables.'
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Connection test failed for {host}:{port}/{database}: {error_msg}")
        return {
            'success': False,
            'tables': [],
            'message': f'Connection failed: {error_msg}'
        }


def get_table_schema(spark, host, port, database, username, password, table):
    """
    Get schema information for a table
    
    Args:
        spark: SparkSession instance
        host: MySQL host
        port: MySQL port
        database: Database name
        username: MySQL username
        password: MySQL password
        table: Table name
    
    Returns:
        dict: {success: bool, columns: list, rowCount: int, message: str}
    """
    try:
        jdbc_url = build_jdbc_url(host, port, database)
        
        logger.info(f"Getting schema for {database}.{table}")
        
        # Read table schema
        df = spark.read.format("jdbc") \
            .option("url", jdbc_url) \
            .option("dbtable", table) \
            .option("user", username) \
            .option("password", password) \
            .option("driver", "com.mysql.cj.jdbc.Driver") \
            .load()
        
        # Get column information
        columns = [{
            'name': field.name,
            'type': str(field.dataType),
            'nullable': field.nullable
        } for field in df.schema.fields]
        
        # Get row count
        row_count = df.count()
        
        logger.info(f"Schema retrieved for {table}: {len(columns)} columns, {row_count} rows")
        
        return {
            'success': True,
            'columns': columns,
            'rowCount': row_count,
            'message': f'Schema retrieved successfully'
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to get schema for {table}: {error_msg}")
        return {
            'success': False,
            'columns': [],
            'rowCount': 0,
            'message': f'Failed to get schema: {error_msg}'
        }


def clone_mysql_to_mysql(spark, source, destination, options):
    """
    Clone data from source MySQL to destination MySQL
    
    Args:
        spark: SparkSession instance
        source: dict with {host, port, database, username, password, table}
        destination: dict with {host, port, database, username, password, table}
        options: dict with {mode, batchSize}
    
    Returns:
        dict: {success: bool, jobId: str, rowsCloned: int, duration: float, message: str}
    """
    job_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        source_url = build_jdbc_url(source['host'], source['port'], source['database'])
        dest_url = build_jdbc_url(destination['host'], destination['port'], destination['database'])
        
        source_table = source['table']
        dest_table = destination.get('table', source_table)
        
        mode = options.get('mode', 'overwrite')  # 'overwrite' or 'append'
        batch_size = options.get('batchSize', 10000)
        
        logger.info(f"Starting clone operation [Job ID: {job_id}]")
        logger.info(f"Source: {source['host']}/{source['database']}.{source_table}")
        logger.info(f"Destination: {destination['host']}/{destination['database']}.{dest_table}")
        logger.info(f"Mode: {mode}, Batch Size: {batch_size}")
        
        # Read from source MySQL
        logger.info("Reading from source...")
        df = spark.read.format("jdbc") \
            .option("url", source_url) \
            .option("dbtable", source_table) \
            .option("user", source['username']) \
            .option("password", source['password']) \
            .option("driver", "com.mysql.cj.jdbc.Driver") \
            .option("fetchSize", str(batch_size)) \
            .load()
        
        row_count = df.count()
        logger.info(f"Read {row_count} rows from source")
        
        # Write to destination MySQL
        logger.info(f"Writing to destination (mode={mode})...")
        df.write.format("jdbc") \
            .option("url", dest_url) \
            .option("dbtable", dest_table) \
            .option("user", destination['username']) \
            .option("password", destination['password']) \
            .option("driver", "com.mysql.cj.jdbc.Driver") \
            .option("batchsize", str(batch_size)) \
            .mode(mode) \
            .save()
        
        duration = time.time() - start_time
        
        logger.info(f"Clone operation completed [Job ID: {job_id}]")
        logger.info(f"Cloned {row_count} rows in {duration:.2f}s")
        
        return {
            'success': True,
            'jobId': job_id,
            'rowsCloned': row_count,
            'duration': duration,
            'message': f'Successfully cloned {row_count} rows from {source_table} to {dest_table}'
        }
        
    except Exception as e:
        duration = time.time() - start_time
        error_msg = str(e)
        logger.error(f"Clone operation failed [Job ID: {job_id}] after {duration:.2f}s: {error_msg}")
        
        return {
            'success': False,
            'jobId': job_id,
            'rowsCloned': 0,
            'duration': duration,
            'message': f'Clone operation failed: {error_msg}'
        }


# In-memory job status storage (for simple implementation)
# In production, this should be replaced with a persistent store like Redis
clone_jobs = {}


def store_job_status(job_id, status):
    """Store job status in memory"""
    clone_jobs[job_id] = status


def get_job_status(job_id):
    """Retrieve job status"""
    return clone_jobs.get(job_id, {
        'success': False,
        'message': 'Job not found'
    })
