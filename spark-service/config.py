"""
Spark Service Configuration
"""

import os

# Spark Configuration
SPARK_CONFIG = {
    'app_name': 'UnifiedDataAccessService',
    'spark_conf': {
        # Master
        'spark.master': os.getenv('SPARK_MASTER', 'local[*]'),
        
        # Memory
        'spark.driver.memory': '1g',
        'spark.executor.memory': '1g',
        
        # Delta Lake extensions
        'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
        'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
        
        # Performance tuning for small data
        'spark.sql.shuffle.partitions': '4',
        'spark.sql.adaptive.enabled': 'true',
        'spark.sql.adaptive.coalescePartitions.enabled': 'true',
        
        # JARs
        'spark.jars': '/opt/spark/jars/mysql-connector-j-8.2.0.jar,'
                      '/opt/spark/jars/delta-spark_2.12-3.0.0.jar,'
                      '/opt/spark/jars/delta-storage-3.0.0.jar',
        
        # Local mode settings
        'spark.local.ip': '127.0.0.1',
        'spark.driver.host': '127.0.0.1',
    }
}

# MySQL Configuration (default, can be overridden per request)
MYSQL_CONFIG = {
    'url': f"jdbc:mysql://{os.getenv('MYSQL_HOST', 'mysql')}:{os.getenv('MYSQL_PORT', '3306')}/{os.getenv('MYSQL_DATABASE', 'users_db')}",
    'user': os.getenv('MYSQL_USER', 'user'),
    'password': os.getenv('MYSQL_PASSWORD', 'password'),
    'driver': 'com.mysql.cj.jdbc.Driver'
}

# Data paths
DATA_PATHS = {
    'parquet': os.getenv('PARQUET_DATA_PATH', '/data/parquet'),
    'delta': os.getenv('DELTA_DATA_PATH', '/data/delta')
}
