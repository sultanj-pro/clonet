# Option 2: Use Pre-built Spark Docker Image

## Instead of installing Spark ourselves, use an official Spark image as base

### Update Dockerfile:

```dockerfile
# Backend Dockerfile using Apache Spark base image
FROM apache/spark:3.5.0-scala2.12-java17-ubuntu

# Switch to root to install Node.js
USER root

# Install Node.js 18
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Spark is already installed at /opt/spark in this base image
ENV SPARK_HOME=/opt/spark
ENV PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin

# Download Delta Lake and MySQL JARs
RUN curl -L -o ${SPARK_HOME}/jars/delta-spark_2.12-3.0.0.jar \
    https://repo1.maven.org/maven2/io/delta/delta-spark_2.12/3.0.0/delta-spark_2.12-3.0.0.jar && \
    curl -L -o ${SPARK_HOME}/jars/delta-storage-3.0.0.jar \
    https://repo1.maven.org/maven2/io/delta/delta-storage/3.0.0/delta-storage-3.0.0.jar && \
    curl -L -o ${SPARK_HOME}/jars/mysql-connector-j-8.2.0.jar \
    https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar

# Set Spark configuration
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

### Advantages:
✅ No manual download needed
✅ Spark pre-configured correctly
✅ Official Apache image

### Disadvantages:
❌ Larger base image
❌ Still requires downloading (but from Docker Hub, usually faster)
❌ Contains full Spark server setup (we only need client tools)
