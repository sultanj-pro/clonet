"""
Database connector utilities for building JDBC connections to various databases.
Supports MySQL and SQL Server.
"""

def get_supported_databases():
    """Return list of supported database types"""
    return ['mysql', 'sqlserver']


def get_jdbc_driver(db_type):
    """
    Get the JDBC driver class name for a given database type
    
    Args:
        db_type (str): Database type ('mysql' or 'sqlserver')
    
    Returns:
        str: Fully qualified JDBC driver class name
    
    Raises:
        ValueError: If database type is not supported
    """
    drivers = {
        'mysql': 'com.mysql.cj.jdbc.Driver',
        'sqlserver': 'com.microsoft.sqlserver.jdbc.SQLServerDriver'
    }
    
    if db_type not in drivers:
        raise ValueError(f"Unsupported database type: {db_type}. Supported types: {list(drivers.keys())}")
    
    return drivers[db_type]


def get_default_port(db_type):
    """
    Get the default port for a given database type
    
    Args:
        db_type (str): Database type ('mysql' or 'sqlserver')
    
    Returns:
        int: Default port number
    
    Raises:
        ValueError: If database type is not supported
    """
    ports = {
        'mysql': 3306,
        'sqlserver': 1433
    }
    
    if db_type not in ports:
        raise ValueError(f"Unsupported database type: {db_type}. Supported types: {list(ports.keys())}")
    
    return ports[db_type]


def build_jdbc_url(db_type, config):
    """
    Build a JDBC URL for connecting to a database
    
    Args:
        db_type (str): Database type ('mysql' or 'sqlserver')
        config (dict): Connection configuration with keys:
            - host (str): Database host
            - port (int): Database port
            - database (str): Database name
            - instance (str, optional): SQL Server instance name
    
    Returns:
        str: JDBC connection URL
    
    Raises:
        ValueError: If database type is not supported or required config is missing
    """
    required_keys = ['host', 'port', 'database']
    missing_keys = [key for key in required_keys if key not in config]
    if missing_keys:
        raise ValueError(f"Missing required configuration keys: {missing_keys}")
    
    if db_type == 'mysql':
        url = f"jdbc:mysql://{config['host']}:{config['port']}/{config['database']}"
        # Add MySQL-specific parameters for better performance and compatibility
        url += "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
        return url
    
    elif db_type == 'sqlserver':
        # Base URL
        url = f"jdbc:sqlserver://{config['host']}:{config['port']}"
        
        # Add instance name if provided
        if config.get('instance'):
            url += f"\\{config['instance']}"
        
        # Add database name
        url += f";databaseName={config['database']}"
        
        # Add SQL Server-specific parameters
        url += ";encrypt=false;trustServerCertificate=true"
        
        return url
    
    else:
        raise ValueError(f"Unsupported database type: {db_type}. Supported types: {get_supported_databases()}")


def get_tables_query(db_type, database_name):
    """
    Get the SQL query to list all tables in a database
    
    Args:
        db_type (str): Database type ('mysql' or 'sqlserver')
        database_name (str): Name of the database
    
    Returns:
        str: SQL query to list tables
    
    Raises:
        ValueError: If database type is not supported
    """
    if db_type == 'mysql':
        return f"""
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = '{database_name}' 
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """
    
    elif db_type == 'sqlserver':
        return f"""
            SELECT TOP 1000 TABLE_NAME 
            FROM {database_name}.INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """
    
    else:
        raise ValueError(f"Unsupported database type: {db_type}. Supported types: {get_supported_databases()}")


def get_connection_properties(config):
    """
    Build connection properties dict for JDBC connection
    
    Args:
        config (dict): Connection configuration with keys:
            - username (str): Database username
            - password (str): Database password
    
    Returns:
        dict: Properties dictionary for JDBC connection
    """
    properties = {
        'user': config.get('username', ''),
        'password': config.get('password', ''),
    }
    
    return properties


def validate_config(db_type, config):
    """
    Validate that configuration has all required fields for a database type
    
    Args:
        db_type (str): Database type ('mysql' or 'sqlserver')
        config (dict): Connection configuration
    
    Returns:
        tuple: (is_valid, error_message)
    """
    required_fields = ['host', 'port', 'database', 'username']
    
    missing_fields = [field for field in required_fields if not config.get(field)]
    
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    if db_type not in get_supported_databases():
        return False, f"Unsupported database type: {db_type}"
    
    return True, None
