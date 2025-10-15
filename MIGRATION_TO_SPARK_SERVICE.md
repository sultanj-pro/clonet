# Migration to Separate Spark Service Container

## Overview
This document describes the migration from a single-container SparkSession implementation to a separate Spark service container architecture for improved performance and resource isolation.

## Problem Statement
The previous implementation (Option 2) had SparkSession running within the backend container, which caused:
- 50+ second query times
- 200-300% CPU usage on backend container
- UI freezing during query execution
- Resource contention between API server and Spark processing

## Solution: PySpark Flask Service (Option C)

### Architecture
- **Backend Container**: Simple Node.js 18 server (HTTP API only)
- **Spark Service Container**: Dedicated Apache Spark 3.5.0 with Python Flask REST API
- **Communication**: HTTP calls from backend to spark-service
- **Session Management**: Single shared SparkSession for all queries

### Expected Performance
- Query time: 1-2 seconds (down from 50+ seconds)
- Backend CPU: <10% (down from 200-300%)
- Spark Service CPU: 50-100% during queries (isolated from backend)

## Implementation Changes

### 1. New Spark Service Container

#### Files Created:
- `spark-service/Dockerfile`
  - Based on apache/spark:3.5.0
  - Adds Python 3.10, Flask, and Spark connectors
  - Includes MySQL JDBC, Delta Lake, and Parquet support

- `spark-service/app.py`
  - Flask REST API with persistent SparkSession
  - Endpoints: `/api/spark/query/mysql`, `/api/spark/query/parquet`, `/api/spark/query/delta`
  - Single global SparkSession initialized on startup
  - Health check endpoint: `/api/spark/health`

- `spark-service/config.py`
  - Centralized Spark configuration
  - Delta Lake extensions configured
  - Performance tuning (4 shuffle partitions for small data)

- `spark-service/requirements.txt`
  - Flask 3.0.0
  - PySpark 3.5.0

### 2. Backend HTTP Client

#### Files Created:
- `backend/clients/sparkServiceClient.js`
  - HTTP client for communicating with Spark service
  - Methods: `executeMySQLQuery()`, `executeParquetQuery()`, `executeDeltaQuery()`
  - 30-second timeout for queries
  - Health check capability

### 3. Updated Backend Services

All three Spark data services migrated from spawning processes to HTTP calls:

#### Modified Files:
- `backend/services/sparkMySQLDataService.js`
  - Changed from `sparkSessionManager.executeSQL()` to `sparkServiceClient.executeMySQLQuery()`
  - Removed temporary view creation logic
  - Simplified initialization to health check only

- `backend/services/sparkParquetDataService.js`
  - Changed from `sparkSessionManager.executeSQL()` to `sparkServiceClient.executeParquetQuery()`
  - Paths now relative to Spark service container (`/data/parquet`)
  - Removed temporary view creation logic

- `backend/services/sparkDeltaDataService.js`
  - Changed from `sparkSessionManager.executeSQL()` to `sparkServiceClient.executeDeltaQuery()`
  - Paths now relative to Spark service container (`/data/delta`)
  - Removed temporary view creation logic

### 4. Backend Dockerfile Simplification

#### File Modified:
- `backend/Dockerfile`
  - **Before**: Based on apache/spark:3.5.0 with Node.js installed on top
  - **After**: Simple node:18-slim image
  - Removed Spark installation, JAR downloads, and Spark environment variables
  - Smaller image size, faster builds

### 5. Docker Compose Configuration

#### File Modified:
- `docker-compose.yml`
  - Added `spark-service` container with:
    - Ports: 8000 (Flask API), 4040 (Spark UI)
    - Volumes: `/data/parquet`, `/data/delta`
    - Environment: MySQL connection details
    - Health check: 60-second start period, 30-second intervals
    - Resource limit: 4GB memory
  - Updated `backend` container:
    - Added `SPARK_SERVICE_URL=http://spark-service:8000` environment variable
    - Added dependency on `spark-service` health check

### 6. Dependencies

#### File Modified:
- `backend/package.json`
  - Added `node-fetch: ^2.7.0` for HTTP client

### 7. Git Ignore

#### File Created:
- `backend/.gitignore`
  - Excludes `metastore_db/`, `derby.log`, `spark-warehouse/`

## Docker Container Overview

### Container: clonet-backend
- **Base Image**: node:18-slim
- **Purpose**: REST API server
- **Ports**: 5000
- **Memory**: 2GB
- **Dependencies**: mysql (healthy), spark-service (healthy)
- **Volumes**: 
  - ./backend:/app
  - backend_node_modules:/app/node_modules
  - ./data/parquet:/app/data/parquet (mounted but not used directly)
  - ./data/delta:/app/data/delta (mounted but not used directly)

### Container: clonet-spark-service
- **Base Image**: apache/spark:3.5.0
- **Purpose**: Spark query execution service
- **Ports**: 8000 (Flask API), 4040 (Spark UI)
- **Memory**: 4GB
- **Dependencies**: mysql (healthy)
- **Volumes**:
  - ./data/parquet:/data/parquet (mounted and used by Spark)
  - ./data/delta:/data/delta (mounted and used by Spark)

## API Endpoints

### Spark Service (Port 8000)

#### Health Check
```
GET /api/spark/health
Response: { "status": "healthy", "spark_version": "3.5.0", ... }
```

#### Execute MySQL Query
```
POST /api/spark/query/mysql
Body: { "sql": "SELECT * FROM users", "config": { ... } }
Response: [{ ... }, { ... }]
```

#### Execute Parquet Query
```
POST /api/spark/query/parquet
Body: { "path": "/data/parquet/users", "sql": "SELECT * FROM parquet_data" }
Response: [{ ... }, { ... }]
```

#### Execute Delta Query
```
POST /api/spark/query/delta
Body: { "path": "/data/delta/users", "sql": "SELECT * FROM delta.`/data/delta/users`" }
Response: [{ ... }, { ... }]
```

## Testing and Validation

### Build and Start
```powershell
# Build all containers
docker compose build

# Start services
docker compose up -d

# Check logs
docker compose logs -f spark-service
docker compose logs -f backend
```

### Health Checks
```powershell
# Spark service health
curl http://localhost:8000/api/spark/health

# Backend health (calls Spark service internally)
curl http://localhost:5000/api/health
```

### Performance Testing
1. Switch backend to SparkSession mode in UI
2. Navigate to Users page
3. Measure query times (expect 1-2 seconds)
4. Monitor CPU usage (expect <10% on backend)
5. Check Spark UI at http://localhost:4040

### Spark UI Access
- URL: http://localhost:4040
- Shows query execution plans, stages, and performance metrics
- Available while Spark service is running

## Migration Steps for New Deployments

1. Pull latest code
2. Build containers: `docker compose build`
3. Start services: `docker compose up -d`
4. Wait for health checks (60+ seconds for Spark service)
5. Verify Spark service: `curl http://localhost:8000/api/spark/health`
6. Test backend: `curl http://localhost:5000/api/health`
7. Access UI and switch to SparkSession mode
8. Test queries and verify performance

## Rollback Plan

If issues occur with the new architecture:

1. Switch backend to "Direct Access" mode in UI (no code changes needed)
2. All Direct Access mode code remains unchanged and functional
3. Can run without Spark service container entirely

## Known Limitations

1. Write operations (CREATE, UPDATE, DELETE) not yet implemented via Spark
   - Users must switch to Direct Access mode for write operations
   - Future enhancement: Implement DataFrame write API

2. Query timeout set to 30 seconds
   - Adjust in `sparkServiceClient.js` if longer queries needed

3. Single SparkSession shared across all requests
   - Concurrent queries may queue
   - Should be sufficient for small-to-medium workloads

## Future Enhancements

1. Implement write operations using Spark DataFrame API
2. Add query result caching
3. Add query cancellation capability
4. Add Spark job monitoring and metrics
5. Consider Spark Thrift Server for multi-session support if needed
6. Add authentication/authorization for Spark service API

## Performance Metrics

### Before (Option 2: Backend with SparkSession)
- Query time: 50+ seconds
- Backend CPU: 200-300%
- User experience: UI freezing, poor responsiveness
- Architecture: Spawning spark-sql process per query

### After (Option C: Separate Spark Service)
- Query time: Expected 1-2 seconds
- Backend CPU: Expected <10%
- Spark Service CPU: 50-100% during queries (isolated)
- User experience: Fast, responsive UI
- Architecture: Persistent SparkSession, HTTP communication

## References

- Spark Documentation: https://spark.apache.org/docs/3.5.0/
- Delta Lake: https://docs.delta.io/latest/index.html
- Flask: https://flask.palletsprojects.com/
- Docker Compose: https://docs.docker.com/compose/
