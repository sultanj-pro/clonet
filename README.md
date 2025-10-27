# Clonet - Database Cloning Tool

A modern full-stack application for cloning data between databases using Apache Spark. Built with React frontend, Node.js backend, and Python Spark service, all containerized with Docker.

## Features

- **Database Connection Management**: Save and manage database connections (MySQL, SQL Server)
- **Database Cloning**: Clone data from source to target databases with table selection
- **Connection Testing**: Verify database credentials and connectivity before operations
- **Spark-Powered**: Uses Apache Spark for efficient data transfer between databases
- **Docker-Based**: Fully containerized for easy deployment and development

## Architecture

- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express.js REST API
- **Spark Service**: Python Flask + PySpark for data operations
- **Application Database**: MySQL 8.0 (stores connection configurations)
- **Supported Target Databases**: MySQL, SQL Server

## Project Structure

```
clonet/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components (Clone, Connections, Config pages)
│   │   ├── services/        # API client services
│   │   └── types/           # TypeScript type definitions
│   ├── Dockerfile.dev       # Development frontend container
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js backend API
│   ├── config/              # Database and service configuration
│   ├── controllers/         # API controllers (clone, connections)
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── server.js            # Main server file
│   ├── Dockerfile.dev       # Development backend container
│   └── package.json         # Backend dependencies
├── spark-service/           # Python Spark service
│   ├── app.py               # Flask application
│   ├── clone_service.py     # Spark cloning operations
│   ├── database_connectors.py # JDBC connection builders
│   ├── Dockerfile           # Spark service container
│   └── requirements.txt     # Python dependencies
├── database/                # Database initialization
│   └── init.sql             # MySQL initialization script

├── docker-compose.yml       # Development orchestration
└── README.md               # This file
```

## Prerequisites

- [Docker](https://www.docker.com/get-started) (version 20.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/) (version 2.0 or higher)

## Quick Start

### 1. Start the Application

```bash
# Navigate to project directory
cd C:\source\clonet

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation (Swagger)**: http://localhost:5000/api-docs
- **Spark Service**: http://localhost:4040 (internal)

### 3. Using the Application

#### Add a Database Connection

1. Navigate to http://localhost:3000
2. Go to **Configuration** → **Connections** tab
3. Click **Add Connection**
4. Fill in connection details:
   - Name: `My MySQL DB`
   - Type: `MySQL` or `SQL Server`
   - Host: `mysql` (or external hostname)
   - Port: `3306` (MySQL) or `1433` (SQL Server)
   - Database: `database_name`
   - Username: `username`
   - Password: `password`
5. Click **Test** to verify connection
6. Click **Save** to store the connection

#### Clone Database Data

1. Go to **Clone** page
2. **Source**: Select or configure source database connection
3. Click **Fetch Tables** to see available tables
4. Select tables to clone
5. **Target**: Select or configure target database connection
6. Click **Start Clone** to begin data transfer
7. Monitor progress in real-time

## Configuration

### Environment Variables

The backend uses environment variables configured in `backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Application Database (MySQL - stores connections)
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=clonet_db

# Spark Service
SPARK_SERVICE_URL=http://spark-service:4040
```

## API Documentation

### Interactive API Documentation

Access comprehensive API documentation at: http://localhost:5000/api-docs

### Key API Endpoints

#### Health & Status
- `GET /api/health` - Backend health check

#### Connections Management
- `GET /api/connections` - List all saved connections
- `POST /api/connections` - Create new connection
- `PUT /api/connections/:id` - Update connection
- `DELETE /api/connections/:id` - Delete connection
- `POST /api/connections/test` - Test database connection

#### Clone Operations
- `POST /api/clone/test-connection` - Test source/target connection
- `POST /api/clone/get-tables` - Fetch available tables from database
- `POST /api/clone/get-schema` - Get table schema details
- `POST /api/clone/start` - Start cloning operation
- `GET /api/clone/status/:jobId` - Check clone job status

## Development

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f spark-service
```

### Restart Services

```bash
# Restart backend after code changes
docker-compose restart backend

# Restart all services
docker-compose restart

# Rebuild after dependency changes
docker-compose up -d --build
```

### Access Container Shell

```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# Spark Service
docker-compose exec spark-service bash

# MySQL
docker-compose exec mysql mysql -u root -p
```

## Troubleshooting

### Port Conflicts

Make sure ports 3000, 5000, 3306, 1433, and 4040 are not in use:

```bash
# Windows PowerShell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5000"
```

### Connection Issues

1. **Cannot connect to database**: Verify host, port, username, and password are correct
2. **Test connection hangs**: Check if target database server is reachable
3. **Clone fails**: Ensure both source and target databases are accessible

### Container Issues

```bash
# Check container status
docker-compose ps

# Check container health
docker inspect clonet-backend --format='{{.State.Health.Status}}'

# View detailed logs
docker-compose logs backend --tail=50

# Restart unhealthy containers
docker-compose restart backend
```

### Database Reset

```bash
# Stop all services and remove volumes
docker-compose down -v

# Restart fresh
docker-compose up -d
```

## Technology Stack

### Frontend
- React 18
- TypeScript
- CSS Modules
- Fetch API

### Backend
- Node.js
- Express.js
- mysql2 (MySQL client)
- Swagger/OpenAPI

### Spark Service
- Python 3.9
- Flask
- PySpark 3.5
- JDBC drivers (MySQL, SQL Server)

### Infrastructure
- Docker
- Docker Compose
- MySQL 8.0
- SQL Server 2022 (optional external)

## Security Considerations

### Development
- Default credentials are used for convenience
- All services are exposed on localhost only

### Production
- Change all default passwords
- Use strong passwords for database connections
- Store sensitive configuration in environment variables
- Use Docker secrets for production deployments
- Implement authentication and authorization
- Use HTTPS/TLS for all connections
- Restrict network access with firewall rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with Docker
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please create an issue in the project repository.
