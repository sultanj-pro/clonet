# Backend Dockerfile with multi-stage build
# Stage 1: Download dependencies
FROM alpine:3.14 as downloader

# Install wget and create download directories
RUN apk add --no-cache wget && \
    mkdir -p /downloads/spark/jars

# Copy any pre-downloaded files
COPY downloads/ /downloads/

# Download Delta Lake JARs if not already present
WORKDIR /downloads/spark/jars
RUN for jar in delta-core_2.12-2.4.0.jar delta-storage-2.4.0.jar; do \
        if [ ! -f "$jar" ]; then \
            wget -q "https://repo1.maven.org/maven2/io/delta/${jar%_*}/${jar#*_}/$jar"; \
        fi \
    done

# Download and extract Apache Spark if not already present
WORKDIR /downloads
RUN if [ ! -f spark-3.3.0-bin-hadoop3.tgz ]; then \
        wget -q https://archive.apache.org/dist/spark/spark-3.3.0/spark-3.3.0-bin-hadoop3.tgz; \
    fi && \
    tar -xzf spark-3.3.0-bin-hadoop3.tgz && \
    mv spark-3.3.0-bin-hadoop3 spark && \
    rm spark-3.3.0-bin-hadoop3.tgz

# Stage 2: Node.js dependencies
FROM node:18-slim as node_deps

WORKDIR /app
COPY package*.json ./
RUN npm install \
    && npm install --only=production \
    && npm cache clean --force

# Stage 3: Final image
FROM openjdk:11-slim

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Spark and Delta Lake from downloader stage
COPY --from=downloader /downloads/spark /opt/spark
COPY --from=downloader /downloads/spark/jars/*.jar /opt/spark/jars/

# Copy Node.js dependencies
COPY --from=node_deps /app/node_modules ./node_modules

# Set environment variables
ENV SPARK_HOME=/opt/spark \
    PATH=$PATH:/opt/spark/bin \
    SPARK_LOCAL_IP=127.0.0.1 \
    SPARK_LOCAL_DIRS=/tmp/spark-temp \
    SPARK_WORKER_DIR=/tmp/spark-worker \
    SPARK_DRIVER_MEMORY=512m \
    SPARK_EXECUTOR_MEMORY=512m \
    SPARK_SQL_SHUFFLE_PARTITIONS=4 \
    NODE_ENV=production

# Create Spark temporary directories
RUN mkdir -p /tmp/spark-temp /tmp/spark-worker && \
    chmod -R 777 /tmp/spark-*

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]