# Quick Start Guide - SparkSession Mode

## Access the Application

**Frontend**: http://localhost:3000  
**Backend API**: http://localhost:5000  
**Swagger Docs**: http://localhost:5000/api-docs

## Switch to SparkSession Mode

### Via UI
1. Open http://localhost:3000
2. Click "Configuration" in navbar
3. Select storage type: **MySQL** (or Parquet/Delta)
4. Select access method: **SparkSession**
5. Click "Save Configuration"
6. Wait ~30-40 seconds
7. Success! ✅

### Via API (PowerShell)
```powershell
# Switch to MySQL + SparkSession
$body = @{ 
    type = 'mysql'
    accessMethod = 'sparksession' 
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri http://localhost:5000/api/config/storage `
    -Method PUT `
    -Body $body `
    -ContentType 'application/json'
```

### Via API (curl)
```bash
# Note: Use PowerShell variable method above for better JSON handling
curl -X PUT http://localhost:5000/api/config/storage \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"mysql\",\"accessMethod\":\"sparksession\"}"
```

## Test Data Fetching

### Via Browser
1. Open http://localhost:3000/users
2. Wait ~45-55 seconds for first load
3. Data appears! ✅

### Via API (PowerShell)
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/users
```

### Via API (curl)
```powershell
curl http://localhost:5000/api/users
```

## Switch Back to Direct Access

### Via UI
1. Go to Configuration page
2. Keep storage type same
3. Change access method to: **Direct**
4. Click "Save Configuration"
5. Notice immediate response! ⚡

### Via API
```powershell
$body = @{ 
    type = 'mysql'
    accessMethod = 'direct' 
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri http://localhost:5000/api/config/storage `
    -Method PUT `
    -Body $body `
    -ContentType 'application/json'
```

## All 6 Combinations

```powershell
# MySQL + Direct
@{ type='mysql'; accessMethod='direct' } | ConvertTo-Json | 
  Invoke-RestMethod -Uri http://localhost:5000/api/config/storage -Method PUT -ContentType 'application/json'

# MySQL + SparkSession  
@{ type='mysql'; accessMethod='sparksession' } | ConvertTo-Json | 
  Invoke-RestMethod -Uri http://localhost:5000/api/config/storage -Method PUT -ContentType 'application/json'

# Parquet + Direct
@{ type='parquet'; accessMethod='direct' } | ConvertTo-Json | 
  Invoke-RestMethod -Uri http://localhost:5000/api/config/storage -Method PUT -ContentType 'application/json'

# Parquet + SparkSession
@{ type='parquet'; accessMethod='sparksession' } | ConvertTo-Json | 
  Invoke-RestMethod -Uri http://localhost:5000/api/config/storage -Method PUT -ContentType 'application/json'

# Delta + Direct
@{ type='delta'; accessMethod='direct' } | ConvertTo-Json | 
  Invoke-RestMethod -Uri http://localhost:5000/api/config/storage -Method PUT -ContentType 'application/json'

# Delta + SparkSession
@{ type='delta'; accessMethod='sparksession' } | ConvertTo-Json | 
  Invoke-RestMethod -Uri http://localhost:5000/api/config/storage -Method PUT -ContentType 'application/json'
```

## Check Current Configuration

```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/config/storage
```

Expected response:
```json
{
  "type": "mysql",
  "accessMethod": "sparksession",
  "label": "MySQL Database via SparkSession"
}
```

## Container Management

```powershell
# Check status
docker compose ps

# View backend logs
docker compose logs backend --tail=50

# View all logs
docker compose logs --tail=50

# Restart backend
docker compose restart backend

# Stop all
docker compose down

# Start all
docker compose up -d

# Rebuild backend
docker compose up -d --build backend
```

## Troubleshooting

### Issue: "Service initialization timed out"
**Solution**: Wait longer or increase timeout in `backend/routes/config.js` (currently 90s)

### Issue: Slow query responses
**Expected**: SparkSession queries take 45-55 seconds due to JVM startup overhead  
**Compare**: Switch to Direct Access mode for <1s queries

### Issue: "SparkSession not available"
**Check**: Backend logs for Spark initialization errors  
**Verify**: `docker compose logs backend | grep -i spark`

### Issue: Wrong column names
**Fixed**: Parser now filters "Response code" line correctly

## Performance Expectations

| Operation | Direct Access | SparkSession |
|-----------|--------------|--------------|
| Init time | <1 second | 30-40 seconds |
| First query | <100ms | 50-60 seconds |
| Next queries | <100ms | 45-55 seconds |

## Success Indicators

✅ All containers running:
```
clonet-frontend   Up
clonet-backend    Up (healthy)
clonet-mysql      Up (healthy)
```

✅ Backend logs show:
```
SparkSessionManager initialized successfully
Running in local mode: local[*]
SparkMySQLDataService initialized successfully
```

✅ API returns proper JSON:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2025-10-15 16:18:13",
    "updated_at": "2025-10-15 16:18:13"
  }
]
```

## Documentation Files

- `SUCCESS_SUMMARY.md` - Overall success summary
- `OPTION2_IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `SPARKSESSION_IMPLEMENTATION_SUMMARY.md` - Complete implementation guide
- `SPARKSESSION_PLAN.md` - Original architecture plan
- `QUICK_START.md` - This file!

---

**Ready to demonstrate SparkSession without a Spark server! 🚀**
