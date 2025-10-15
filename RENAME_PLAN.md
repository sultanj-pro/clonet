# Application Rename Plan: "clonet" → "users"

## Overview
This document outlines the steps and ramifications of renaming the application from "clonet" to "users".

---

## Files That Need to Be Changed

### 1. **Root Directory Files**
- `README.md` - Update all references to "Clonet" and "clonet"
- `package-lock.json` - Update name field
- Directory name itself: `C:\source\clonet` → `C:\source\users`

### 2. **Frontend Files**
- `frontend/package.json` - Change `"name": "clonet-frontend"` → `"users-frontend"`
- `frontend/package-lock.json` - Update name references (2 locations)
- `frontend/public/index.html` - Update title and meta description
- `frontend/public/manifest.json` - Update `short_name` and `name` fields

### 3. **Backend Files**
- `backend/package.json` - Change `"name": "clonet-backend"` → `"users-backend"`
- `backend/package.json` - Update description field
- `backend/package-lock.json` - Update name references (2 locations)
- `backend/server.js` - Update `customSiteTitle` in Swagger config
- `backend/config/swagger.js` - Update API title, contact info, and server URL
- `backend/config/database.js` - Update database name reference
- `backend/config/storage.js` - Update database name, user, password defaults
- `backend/.env.example` - Update DB_NAME

### 4. **Database Files**
- `database/init.sql` - Update database name from `clonet_db` → `users_db`

### 5. **Docker Files**
- `docker-compose.yml` - Update:
  - Container names (clonet-frontend → users-frontend, etc.)
  - Image names (clonet-frontend:latest → users-frontend:latest, etc.)
  - Network name (clonet-network → users-network)
  - Database name (clonet_db → users_db)
  - Database user (clonet_user → users_user)
  - Database password (clonet_password → users_password)
  
- `docker-compose.prod.yml` - Same updates as docker-compose.yml

---

## Detailed Changes by File

### docker-compose.yml (13 changes)
```yaml
# Change container names:
container_name: clonet-frontend → users-frontend
container_name: clonet-backend → users-backend
container_name: clonet-mysql → users-mysql

# Change image names:
image: clonet-frontend:latest → users-frontend:latest
image: clonet-backend:latest → users-backend:latest

# Change network name:
- clonet-network → users-network
clonet-network: → users-network:

# Change database config:
DB_NAME=clonet_db → DB_NAME=users_db
MYSQL_DATABASE: clonet_db → users_db
MYSQL_USER: clonet_user → users_user
MYSQL_PASSWORD: clonet_password → users_password
```

### Frontend Changes (5 changes)
```json
// package.json
"name": "clonet-frontend" → "users-frontend"

// manifest.json
"short_name": "Clonet" → "Users"
"name": "Clonet Application" → "Users Application"

// index.html
<title>Clonet</title> → <title>Users</title>
content="Clonet - A modern web application" → "Users - A modern web application"
```

### Backend Changes (10+ changes)
```json
// package.json
"name": "clonet-backend" → "users-backend"
"description": "Backend API for Clonet application" → "Users application"

// swagger.js
title: 'Clonet API' → 'Users API'
name: 'Clonet Team' → 'Users Team'
email: 'support@clonet.com' → 'support@users.com'
url: 'https://api.clonet.com' → 'https://api.users.com'

// database.js, storage.js
database: 'clonet_db' → 'users_db'
user: 'clonet_user' → 'users_user'
password: 'clonet_password' → 'users_password'

// server.js
customSiteTitle: "Clonet API Documentation" → "Users API Documentation"
```

### Database Changes (2 changes)
```sql
-- database/init.sql
CREATE DATABASE IF NOT EXISTS clonet_db; → users_db;
USE clonet_db; → users_db;
```

---

## Ramifications & Considerations

### 🔴 **BREAKING CHANGES**

1. **Docker Containers**
   - All existing containers must be stopped and removed
   - New containers will have different names
   - Cannot run old and new versions simultaneously on same host
   - Docker volumes may need recreation if using named volumes

2. **Database**
   - Database name changes from `clonet_db` → `users_db`
   - **DATA LOSS RISK**: Existing MySQL data won't be accessible without migration
   - Need to export existing data and import into new database
   - Or update MySQL container to rename database

3. **Docker Images**
   - Old images (`clonet-frontend:latest`, `clonet-backend:latest`) will become orphaned
   - Need manual cleanup of old images
   - Registry tags need updating if using image registry

4. **Network**
   - Docker network name changes (`clonet-network` → `users-network`)
   - Breaks compatibility with any external services connected to old network

5. **Environment Variables**
   - Any `.env` files or environment configs need updating
   - CI/CD pipelines need updating
   - Production deployments need configuration updates

### 🟡 **MEDIUM IMPACT**

6. **Documentation**
   - All README references need updating
   - API documentation URLs change
   - Swagger UI shows new application name

7. **Git Repository**
   - Repository name might need changing on GitHub
   - Clone URLs would change
   - Local directory path changes (`C:\source\clonet` → `C:\source\users`)

8. **Dependencies**
   - `package-lock.json` files regenerated
   - `node_modules` may need reinstallation

### 🟢 **LOW IMPACT**

9. **Code Logic**
   - Application logic unchanged
   - No functional changes to features
   - API endpoints remain the same

10. **File Structure**
    - Internal file structure unchanged
    - Only naming/branding changes

---

## Migration Steps (Recommended Order)

### Phase 1: Pre-Migration
1. ✅ Backup all data from current MySQL database
2. ✅ Export users table: `docker exec clonet-mysql mysqldump -uroot -ppassword clonet_db > backup.sql`
3. ✅ Stop all running containers: `docker-compose down`
4. ✅ Create a backup branch in git: `git checkout -b backup-before-rename`

### Phase 2: Code Changes
5. ✅ Update all files listed above (use find/replace)
6. ✅ Update package.json files
7. ✅ Update docker-compose.yml and docker-compose.prod.yml
8. ✅ Update database/init.sql
9. ✅ Update frontend public files
10. ✅ Update backend config files

### Phase 3: Testing
11. ✅ Delete old containers: `docker-compose down -v` (removes volumes)
12. ✅ Remove old images: `docker image rm clonet-frontend clonet-backend`
13. ✅ Rebuild containers: `docker-compose build --no-cache`
14. ✅ Start new containers: `docker-compose up -d`
15. ✅ Initialize database: `Get-Content database/init.sql | docker exec -i users-mysql mysql -uroot -ppassword`
16. ✅ Import backed up data (if database name in backup is clonet_db, need to modify)
17. ✅ Test all three storage modes (MySQL, Parquet, Delta)
18. ✅ Verify frontend loads at http://localhost:3000
19. ✅ Verify backend API at http://localhost:5000

### Phase 4: Directory Rename (Optional)
20. ✅ Stop containers
21. ✅ Move directory: `mv C:\source\clonet C:\source\users`
22. ✅ Update any IDE workspace settings
23. ✅ Restart containers from new location

### Phase 5: Git & Deployment
24. ✅ Commit changes: `git add -A && git commit -m "Rename application from clonet to users"`
25. ✅ Push to repository: `git push origin master`
26. ✅ Update GitHub repository name (if desired)
27. ✅ Update any CI/CD configurations
28. ✅ Update production deployment configs

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during database rename | HIGH | Backup before starting, test restore procedure |
| Breaking production deployment | HIGH | Test in development first, plan deployment window |
| Docker volume data inaccessible | MEDIUM | Use bind mounts (already done), backup data directories |
| Old containers interfering | LOW | Run `docker-compose down -v` before rebuild |
| Package dependency issues | LOW | Regenerate package-lock.json after rename |
| Git history confusion | LOW | Good commit message, consider keeping clonet in description |

---

## Estimated Time
- **Code changes**: 30-45 minutes
- **Testing**: 15-30 minutes  
- **Database migration**: 10-15 minutes
- **Total**: 1-1.5 hours

---

## Recommendation

**Should you rename?**

✅ **YES, if:**
- Application is still in development
- "users" better reflects the application purpose
- No production deployments yet
- Limited external dependencies

❌ **NO, if:**
- Application is in production with users
- Many external integrations reference "clonet"
- Brand recognition already established
- Short timeline for delivery

**Alternative**: Keep internal name "clonet" but update display names only (titles, UI text) - minimal risk approach.

---

## Summary of Changes

- **Total files to modify**: ~20 files
- **Total text replacements**: ~50 occurrences
- **Database objects affected**: 1 (database name)
- **Docker objects affected**: 3 containers, 1 network, 3 images
- **Breaking changes**: Yes (containers, database, network names)
- **Reversibility**: Yes, but requires same process in reverse

---

*Generated: October 15, 2025*
