/**
 * Spark Service HTTP Client
 * Communicates with the separate Spark service container
 */

const fetch = require('node-fetch');

class SparkServiceClient {
  constructor() {
    this.baseUrl = process.env.SPARK_SERVICE_URL || 'http://spark-service:8000';
    this.timeout = parseInt(process.env.SPARK_TIMEOUT || '30000'); // 30 seconds
  }

  /**
   * Execute a MySQL query via Spark
   */
  async executeMySQLQuery(sql, config) {
    return this.executeQuery('mysql', { sql, config });
  }

  /**
   * Execute a Parquet query via Spark
   */
  async executeParquetQuery(path, sql = null) {
    return this.executeQuery('parquet', { path, sql });
  }

  /**
   * Execute a Delta query via Spark
   */
  async executeDeltaQuery(path, sql = null) {
    return this.executeQuery('delta', { path, sql });
  }

  /**
   * Generic query execution
   */
  async executeQuery(queryType, payload) {
    const url = `${this.baseUrl}/api/spark/query/${queryType}`;
    
    console.log(`Spark service request: POST ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }

      console.log(`Spark query completed: ${result.rowCount} rows in ${result.executionTimeMs}ms`);
      
      return result.data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Spark query timeout after ${this.timeout}ms`);
      }
      console.error('Spark service error:', error.message);
      throw error;
    }
  }

  /**
   * Check if Spark service is healthy
   */
  async healthCheck() {
    const url = `${this.baseUrl}/health`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000
      });

      const result = await response.json();
      return response.ok && result.status === 'healthy';
      
    } catch (error) {
      console.error('Spark service health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get Spark service information
   */
  async getInfo() {
    const url = `${this.baseUrl}/api/spark/info`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Failed to get Spark service info:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SparkServiceClient();
