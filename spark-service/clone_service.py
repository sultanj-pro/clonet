"""
Clone Service - Database to Database data cloning using Spark
Supports MySQL and SQL Server
Handles connection testing, schema retrieval, and data cloning operations
"""

import time
import logging
from pyspark.sql import SparkSession
import uuid
from database_connectors import (
    build_jdbc_url, 
    get_jdbc_driver, 
    get_tables_query,
    get_connection_properties,
    validate_config,
    get_supported_databases
)

logger = logging.getLogger(__name__)


def test_connection(spark, config):
    """
    Test database connection and return list of tables
    
    Args:
        spark: SparkSession instance
        config: dict with {type, host, port, database, username, password}
    
    Returns:
        dict: {success: bool, tables: list, message: str}
    """
    try:
        db_type = config.get('type', 'mysql')
        
        # Validate configuration
        is_valid, error_msg = validate_config(db_type, config)
        if not is_valid:
            return {
                'success': False,
                'tables': [],
                'message': error_msg
            }
        
        jdbc_url = build_jdbc_url(db_type, config)
        jdbc_driver = get_jdbc_driver(db_type)
        
        logger.info(f"Testing connection to {db_type}: {config['host']}:{config['port']}/{config['database']}")
        
        # Get tables query based on database type
        query = get_tables_query(db_type, config['database'])
        
        df = spark.read.format("jdbc") \
            .option("url", jdbc_url) \
            .option("query", query) \
            .option("user", config['username']) \
            .option("password", config.get('password', '')) \
            .option("driver", jdbc_driver) \
            .load()
        
        tables = [row['TABLE_NAME'] for row in df.collect()]
        
        logger.info(f"Successfully connected to {db_type} {config['host']}:{config['port']}/{config['database']}, found {len(tables)} tables")
        
        return {
            'success': True,
            'tables': tables,
            'message': f'Connected successfully. Found {len(tables)} tables.'
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Connection test failed for {config.get('type', 'mysql')} {config.get('host')}:{config.get('port')}/{config.get('database')}: {error_msg}")
        return {
            'success': False,
            'tables': [],
            'message': f'Connection failed: {error_msg}'
        }


def get_table_schema(spark, config, table):
    """
    Get schema information for a table
    
    Args:
        spark: SparkSession instance
        config: dict with {type, host, port, database, username, password}
        table: Table name
    
    Returns:
        dict: {success: bool, columns: list, rowCount: int, message: str}
    """
    try:
        db_type = config.get('type', 'mysql')
        jdbc_url = build_jdbc_url(db_type, config)
        jdbc_driver = get_jdbc_driver(db_type)
        
        logger.info(f"Getting schema for {db_type} {config['database']}.{table}")
        
        # Read table schema
        df = spark.read.format("jdbc") \
            .option("url", jdbc_url) \
            .option("dbtable", table) \
            .option("user", config['username']) \
            .option("password", config.get('password', '')) \
            .option("driver", jdbc_driver) \
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


def clone_data(spark, source, destination, options):
    """
    Clone data from source database to destination database
    Supports MySQL and SQL Server (and any JDBC-compatible database)
    
    Args:
        spark: SparkSession instance
        source: dict with {type, host, port, database, username, password, table}
        destination: dict with {type, host, port, database, username, password, table}
        options: dict with {mode, batchSize}
    
    Returns:
        dict: {success: bool, jobId: str, rowsCloned: int, duration: float, message: str}
    """
    job_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        source_type = source.get('type', 'mysql')
        dest_type = destination.get('type', 'mysql')
        
        source_url = build_jdbc_url(source_type, source)
        dest_url = build_jdbc_url(dest_type, destination)
        
        source_driver = get_jdbc_driver(source_type)
        dest_driver = get_jdbc_driver(dest_type)
        
        source_table = source['table']
        dest_table = destination.get('table', source_table)
        
        mode = options.get('mode', 'overwrite')  # 'overwrite' or 'append'
        batch_size = options.get('batchSize', 10000)
        
        logger.info(f"Starting clone operation [Job ID: {job_id}]")
        logger.info(f"Source: {source_type} {source['host']}/{source['database']}.{source_table}")
        logger.info(f"Destination: {dest_type} {destination['host']}/{destination['database']}.{dest_table}")
        logger.info(f"Mode: {mode}, Batch Size: {batch_size}")
        
        # Read from source database
        logger.info("Reading from source...")
        df = spark.read.format("jdbc") \
            .option("url", source_url) \
            .option("dbtable", source_table) \
            .option("user", source['username']) \
            .option("password", source.get('password', '')) \
            .option("driver", source_driver) \
            .option("fetchSize", str(batch_size)) \
            .load()
        
        row_count = df.count()
        logger.info(f"Read {row_count} rows from source")
        
        # Write to destination database
        logger.info(f"Writing to destination (mode={mode})...")
        df.write.format("jdbc") \
            .option("url", dest_url) \
            .option("dbtable", dest_table) \
            .option("user", destination['username']) \
            .option("password", destination.get('password', '')) \
            .option("driver", dest_driver) \
            .option("batchsize", str(batch_size)) \
            .mode(mode) \
            .save()
        
        duration = time.time() - start_time
        
        logger.info(f"Clone operation completed [Job ID: {job_id}]")
        logger.info(f"Cloned {row_count} rows from {source_type} to {dest_type} in {duration:.2f}s")
        
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
