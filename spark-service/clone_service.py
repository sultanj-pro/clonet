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


def validate_clone_job(spark, source, destination, tables, sample_size=1000):
    """
    Validate a clone job by checking if source tables exist, destination tables are compatible,
    and schemas match. This is a read-only operation that doesn't write any data.
    
    Args:
        spark: SparkSession object
        source: Source database config {host, port, database, username, password, type}
        destination: Destination database config {host, port, database, username, password, type}
        tables: List of table names to validate
        sample_size: Number of rows to sample from source for validation
    
    Returns:
        {
            'success': bool,
            'validation': [
                {
                    'table': str,
                    'sourceExists': bool,
                    'destExists': bool,
                    'sourceRowSampleCount': int,
                    'schemaMatch': bool,
                    'sourceSchema': [{'name': str, 'type': str}],
                    'destSchema': [{'name': str, 'type': str}],
                    'warnings': [str],
                    'error': str or None
                }
            ],
            'overall': {
                'success': bool,
                'totalEstimatedRows': int,
                'warnings': [str]
            }
        }
    """
    from database_connectors import build_jdbc_url, get_jdbc_driver, get_connection_properties
    import logging
    
    logger = logging.getLogger(__name__)
    validation_results = []
    overall_warnings = []
    total_estimated_rows = 0
    overall_success = True
    
    try:
        source_type = source.get('type', 'mysql')
        dest_type = destination.get('type', 'mysql')
        
        logger.info(f"Starting validation for {len(tables)} tables from {source_type} to {dest_type}")
        
        for table_name in tables:
            table_result = {
                'table': table_name,
                'sourceExists': False,
                'destExists': False,
                'sourceRowSampleCount': 0,
                'schemaMatch': False,
                'sourceSchema': [],
                'destSchema': [],
                'warnings': [],
                'error': None
            }
            
            try:
                # Check source table exists and get schema
                source_jdbc_url = build_jdbc_url(source_type, source)
                source_driver = get_jdbc_driver(source_type)
                source_props = get_connection_properties(source)
                
                source_check_query = f"SELECT * FROM {table_name} LIMIT 0"
                try:
                    source_df = spark.read.format("jdbc") \
                        .option("url", source_jdbc_url) \
                        .option("query", source_check_query) \
                        .option("driver", source_driver) \
                        .options(**source_props) \
                        .load()
                    
                    table_result['sourceExists'] = True
                    source_schema = source_df.schema
                    table_result['sourceSchema'] = [
                        {'name': field.name, 'type': str(field.dataType)}
                        for field in source_schema.fields
                    ]
                    logger.info(f"Source table '{table_name}' found with {len(source_schema.fields)} columns")
                    
                    # Get row count from source
                    count_query = f"SELECT COUNT(*) as cnt FROM {table_name}"
                    count_df = spark.read.format("jdbc") \
                        .option("url", source_jdbc_url) \
                        .option("query", count_query) \
                        .option("driver", source_driver) \
                        .options(**source_props) \
                        .load()
                    
                    row_count = count_df.collect()[0][0]
                    table_result['sourceRowSampleCount'] = min(row_count, sample_size)
                    total_estimated_rows += row_count
                    logger.info(f"Source table '{table_name}' has {row_count} rows")
                    
                except Exception as e:
                    table_result['error'] = f"Cannot read source table: {str(e)}"
                    table_result['sourceExists'] = False
                    overall_success = False
                    logger.error(f"Error reading source table '{table_name}': {str(e)}")
                
                # Check destination table exists and get schema
                if table_result['sourceExists']:
                    dest_jdbc_url = build_jdbc_url(dest_type, destination)
                    dest_driver = get_jdbc_driver(dest_type)
                    dest_props = get_connection_properties(destination)
                    
                    dest_check_query = f"SELECT * FROM {table_name} LIMIT 0"
                    try:
                        dest_df = spark.read.format("jdbc") \
                            .option("url", dest_jdbc_url) \
                            .option("query", dest_check_query) \
                            .option("driver", dest_driver) \
                            .options(**dest_props) \
                            .load()
                        
                        table_result['destExists'] = True
                        dest_schema = dest_df.schema
                        table_result['destSchema'] = [
                            {'name': field.name, 'type': str(field.dataType)}
                            for field in dest_schema.fields
                        ]
                        logger.info(f"Destination table '{table_name}' found with {len(dest_schema.fields)} columns")
                        
                        # Compare schemas
                        source_cols = {f.name.lower(): str(f.dataType) for f in source_schema.fields}
                        dest_cols = {f.name.lower(): str(f.dataType) for f in dest_schema.fields}
                        
                        # Check for missing columns
                        missing_in_dest = set(source_cols.keys()) - set(dest_cols.keys())
                        extra_in_dest = set(dest_cols.keys()) - set(source_cols.keys())
                        
                        if missing_in_dest:
                            table_result['warnings'].append(
                                f"Destination missing columns: {', '.join(sorted(missing_in_dest))}"
                            )
                            overall_success = False
                        
                        if extra_in_dest:
                            table_result['warnings'].append(
                                f"Destination has extra columns: {', '.join(sorted(extra_in_dest))}"
                            )
                        
                        # Check for type mismatches
                        type_mismatches = []
                        for col in source_cols.keys():
                            if col in dest_cols and source_cols[col] != dest_cols[col]:
                                type_mismatches.append(
                                    f"{col}: {source_cols[col]} -> {dest_cols[col]}"
                                )
                        
                        if type_mismatches:
                            table_result['warnings'].append(
                                f"Type mismatches: {', '.join(type_mismatches)}"
                            )
                            overall_success = False
                        
                        # Schema matches if no missing columns and no type mismatches
                        table_result['schemaMatch'] = len(missing_in_dest) == 0 and len(type_mismatches) == 0
                        
                        logger.info(f"Schema comparison for '{table_name}': match={table_result['schemaMatch']}")
                        
                    except Exception as e:
                        table_result['warnings'].append(
                            f"Destination table not found or not readable: {str(e)}"
                        )
                        table_result['destExists'] = False
                        logger.warning(f"Destination table '{table_name}' issue: {str(e)}")
                
            except Exception as e:
                table_result['error'] = str(e)
                overall_success = False
                logger.error(f"Validation error for table '{table_name}': {str(e)}")
            
            # Collect warnings
            if table_result['warnings']:
                overall_warnings.extend(table_result['warnings'])
            
            validation_results.append(table_result)
        
        logger.info(f"Validation complete: success={overall_success}, warnings={len(overall_warnings)}")
        
        return {
            'success': overall_success,
            'validation': validation_results,
            'overall': {
                'success': overall_success,
                'totalEstimatedRows': total_estimated_rows,
                'warnings': overall_warnings
            }
        }
    
    except Exception as e:
        logger.error(f"Fatal error in validate_clone_job: {str(e)}")
        return {
            'success': False,
            'validation': [],
            'overall': {
                'success': False,
                'totalEstimatedRows': 0,
                'warnings': [str(e)]
            }
        }


def store_job_status(job_id, status):
    """Store job status in memory"""
    clone_jobs[job_id] = status


def get_job_status(job_id):
    """Retrieve job status"""
    return clone_jobs.get(job_id, {
        'success': False,
        'message': 'Job not found'
    })
