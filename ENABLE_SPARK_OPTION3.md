# Option 3: Try Download Again with Better Network

## If your internet connection improves, retry the original approach

### Update Dockerfile with retry logic and better mirrors:

```dockerfile
# Backend Dockerfile with Apache Spark
FROM node:18-slim

WORKDIR /app

# Install Java and download tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    wget \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Download Apache Spark with multiple retry attempts and mirror fallback
ENV SPARK_VERSION=3.5.0
ENV HADOOP_VERSION=3
ENV SPARK_HOME=/opt/spark
ENV PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin

# Try multiple mirrors with extended timeout
RUN (wget --timeout=300 --tries=5 --retry-connrefused --progress=bar:force \
    https://dlcdn.apache.org/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz \
    || wget --timeout=300 --tries=5 --retry-connrefused --progress=bar:force \
    https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz \
    || wget --timeout=300 --tries=5 --retry-connrefused --progress=bar:force \
    https://downloads.apache.org/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz) && \
    tar -xzf spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz && \
    mv spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} ${SPARK_HOME} && \
    rm spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz

# Download Delta Lake JARs
RUN wget --timeout=120 --tries=3 -P ${SPARK_HOME}/jars \
    https://repo1.maven.org/maven2/io/delta/delta-spark_2.12/3.0.0/delta-spark_2.12-3.0.0.jar \
    https://repo1.maven.org/maven2/io/delta/delta-storage/3.0.0/delta-storage-3.0.0.jar

# Download MySQL JDBC Driver
RUN wget --timeout=120 --tries=3 -P ${SPARK_HOME}/jars \
    https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar

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

### Tips:
- Build during off-peak hours
- Use wired connection instead of WiFi
- Increase Docker build timeout if needed
- Use `--progress=bar:force` to see download progress

### Advantages:
✅ Simple approach
✅ Clean image
✅ No manual steps

### Disadvantages:
❌ Requires good internet
❌ Build takes 10-15 minutes
❌ May fail if network is unstable
