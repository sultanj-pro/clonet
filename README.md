# Clonet

A modern full-stack web application built with React frontend, Node.js backend, and MySQL database, all containerized with Docker.

## Architecture

- **Frontend**: React 18 with modern hooks and component architecture
- **Backend**: Node.js with Express.js REST API and direct MySQL integration
- **Database**: MySQL 8.0 with phpMyAdmin for database management
- **Containerization**: Docker and Docker Compose for easy development and deployment

## Project Structure

```
clonet/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/                 # React source code
│   ├── package.json         # Frontend dependencies
│   ├── Dockerfile           # Production frontend container
│   └── Dockerfile.dev       # Development frontend container
├── backend/                 # Node.js backend API
│   ├── config/              # Configuration files
│   ├── routes/              # API route handlers
│   ├── package.json         # Backend dependencies
│   ├── server.js            # Main server file
│   ├── Dockerfile           # Production backend container
│   └── Dockerfile.dev       # Development backend container
├── database/                # Database scripts
│   └── init.sql             # Database initialization script
├── docker-compose.yml       # Development containers orchestration
├── docker-compose.prod.yml  # Production containers orchestration
└── README.md               # This file
```

## Prerequisites

- [Docker](https://www.docker.com/get-started) (version 20.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/) (version 2.0 or higher)

## Quick Start

### Development Environment

1. **Clone and navigate to the project:**
   ```bash
   cd C:\source\clonet
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the applications:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - **API Documentation (Swagger)**: http://localhost:5000/api-docs
   - Database Admin (phpMyAdmin): http://localhost:8080
   - MySQL Database: localhost:3306

4. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f frontend
   docker-compose logs -f backend
   docker-compose logs -f mysql
   ```

### Production Environment

1. **Set up environment variables:**
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with your production values
   ```

2. **Deploy with production configuration:**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

## API Documentation

### Interactive API Documentation (Swagger)

The API includes comprehensive interactive documentation powered by Swagger/OpenAPI 3.0:

- **URL**: http://localhost:5000/api-docs
- **Features**:
  - Interactive API testing interface
  - Complete endpoint documentation
  - Request/response schemas
  - Authentication requirements
  - Example requests and responses

### API Endpoints

### Health Check
- `GET /api/health` - Backend health status
- `GET /api/db-status` - Database connection status

### Users Management
- `GET /api/users` - Get all users (with optional pagination and search)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Example API Usage

```bash
# Get all users
curl http://localhost:5000/api/users

# Get users with pagination
curl "http://localhost:5000/api/users?page=1&pageSize=5"

# Search users
curl "http://localhost:5000/api/users?search=john"

# Create a new user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Update a user
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}'

# Delete a user
curl -X DELETE http://localhost:5000/api/users/1

# Verify backend health
curl http://localhost:5000/api/health
```

**Note**: For easier API testing, use the interactive Swagger documentation at http://localhost:5000/api-docs

## Database

### Connection Details
- **Host**: mysql (within Docker network) or localhost (from host machine)
- **Port**: 3306
- **Database**: clonet_db
- **Root Password**: password (development) / configured (production)

### Initial Data
The database is automatically initialized with sample users when first started.

### Database Management
Access phpMyAdmin at http://localhost:8080 to manage the database visually.

## Development

### Frontend Development
```bash
# Install dependencies locally (optional, for IDE support)
cd frontend
npm install

# The frontend auto-reloads when you make changes to files in ./frontend/src/
```

### Backend Development
```bash
# Install dependencies locally (optional, for IDE support)
cd backend
npm install

# The backend auto-restarts when you make changes to files in ./backend/
```

### Environment Variables

Create a `.env` file in the backend directory for local development:

```env
NODE_ENV=development
PORT=5000
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=clonet_db
```

## Docker Commands

### Useful Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start services
docker-compose up -d --build

# View running containers
docker-compose ps

# Execute commands in containers
docker-compose exec backend npm install package-name
docker-compose exec frontend npm install package-name

# Access container shell
docker-compose exec backend sh
docker-compose exec mysql mysql -u root -p

# Clean up everything (including volumes)
docker-compose down -v
docker system prune -a
```

### Troubleshooting

1. **Port conflicts**: Make sure ports 3000, 5000, 3306, and 8080 are not in use by other applications.

2. **Database connection issues**: Wait a few moments after starting for MySQL to fully initialize.

3. **File changes not reflecting**: 
   - For frontend: Make sure Docker has access to your filesystem
   - For backend: Check that nodemon is working in the container logs

4. **Permission issues**: On Linux/Mac, you might need to adjust file permissions:
   ```bash
   sudo chown -R $USER:$USER .
   ```

## Security Considerations

### Development
- Default passwords are used for convenience
- All services are exposed on localhost

### Production
- Change all default passwords in `.env.prod`
- Use environment-specific configurations
- Consider using Docker secrets for sensitive data
- Implement proper authentication and authorization
- Use HTTPS in production
- Configure firewall rules appropriately

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with Docker
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please create an issue in the project repository.