# Option 1: Install Spark by Downloading Locally

## Steps:

### 1. Download Spark on Your Machine
Download from: https://dlcdn.apache.org/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz
Or mirror: https://archive.apache.org/dist/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz

Save to: `C:\source\clonet\backend\spark-3.5.0-bin-hadoop3.tgz`

### 2. Update Dockerfile to Use Local File

Replace the current Dockerfile with this:

```dockerfile
# Backend Dockerfile with Apache Spark (using local file)
FROM node:18-slim

WORKDIR /app

# Install Java (required for Spark)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy Spark tarball from local filesystem (faster than downloading)
COPY spark-3.5.0-bin-hadoop3.tgz /tmp/

# Install Apache Spark
ENV SPARK_VERSION=3.5.0
ENV SPARK_HOME=/opt/spark
ENV PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin

RUN tar -xzf /tmp/spark-3.5.0-bin-hadoop3.tgz -C /tmp && \
    mv /tmp/spark-3.5.0-bin-hadoop3 ${SPARK_HOME} && \
    rm /tmp/spark-3.5.0-bin-hadoop3.tgz

# Download Delta Lake JARs (smaller files, should work)
RUN apt-get update && apt-get install -y wget && \
    wget -q -P ${SPARK_HOME}/jars \
    https://repo1.maven.org/maven2/io/delta/delta-spark_2.12/3.0.0/delta-spark_2.12-3.0.0.jar \
    https://repo1.maven.org/maven2/io/delta/delta-storage/3.0.0/delta-storage-3.0.0.jar \
    https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar && \
    apt-get remove -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Set Spark configuration for local mode
ENV SPARK_MASTER=local[*]
ENV SPARK_DRIVER_MEMORY=1g
ENV SPARK_EXECUTOR_MEMORY=1g
ENV SPARK_LOCAL_IP=127.0.0.1

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p /app/data/parquet /app/data/delta

# Expose ports
EXPOSE 5000
EXPOSE 4040

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
```

### 3. Build and Start

```powershell
# Build backend with Spark
docker compose build --no-cache backend

# Start all containers
docker compose up -d
```

### Advantages:
✅ Fast - no waiting for download during build
✅ Reliable - no network issues
✅ Can build offline

### Disadvantages:
❌ Larger Docker image (~800MB)
❌ Need to download Spark manually first
