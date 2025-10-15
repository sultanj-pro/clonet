import React, { useState, useEffect } from 'react';
import { getStorageConfig, updateStorageConfig } from '../services';
import Loading from './Loading';
import './ConfigurationPage.css';

const ConfigurationPage: React.FC = () => {
  const [storageType, setStorageType] = useState<'mysql' | 'parquet' | 'delta'>('mysql');
  const [accessMethod, setAccessMethod] = useState<'direct' | 'sparksession'>('direct');
  const [configLabel, setConfigLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const config = await getStorageConfig();
      setStorageType(config.type);
      setAccessMethod(config.accessMethod || 'direct');
      setConfigLabel(config.label || '');
      setError('');
    } catch (err) {
      setError('Failed to load configuration');
      console.error('Error loading configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigurationChange = async (
    newType?: 'mysql' | 'parquet' | 'delta',
    newAccessMethod?: 'direct' | 'sparksession'
  ) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
      
      const targetType = newType || storageType;
      const targetAccessMethod = newAccessMethod || accessMethod;
      
      // Special warning for SparkSession mode
      if (targetAccessMethod === 'sparksession') {
        setSuccessMessage(`Attempting to switch to ${targetType} via SparkSession (requires Apache Spark installed)...`);
      } else {
        setSuccessMessage(`Switching to ${targetType} via ${targetAccessMethod}...`);
      }

      const response = await updateStorageConfig({ 
        type: targetType,
        accessMethod: targetAccessMethod
      });
      
      // Check if the server actually switched to the requested mode
      if (response.accessMethod === targetAccessMethod) {
        setStorageType(response.type);
        setAccessMethod(response.accessMethod || 'direct');
        setConfigLabel(response.label || '');
        setSuccessMessage(`Successfully switched to ${response.label || targetType}`);
      } else {
        // Server couldn't switch (likely Spark not installed)
        setError(
          `Cannot switch to SparkSession mode: Apache Spark is not installed in the backend container. ` +
          `The application remains in ${response.label || 'Direct Access'} mode. ` +
          `See CURRENT_STATUS.md for instructions on enabling SparkSession.`
        );
        // Update to actual server state
        setStorageType(response.type);
        setAccessMethod(response.accessMethod || 'direct');
        setConfigLabel(response.label || '');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update storage configuration';
      
      // Enhanced error message for SparkSession failures
      if (errorMessage.includes('Spark') || errorMessage.includes('sparksession')) {
        setError(
          `SparkSession mode is not available: Apache Spark is not installed. ` +
          `The application is running in Direct Access mode. ` +
          `Error details: ${errorMessage}`
        );
      } else {
        setError(errorMessage);
      }
      
      console.error('Error updating configuration:', err);
      
      // Reload to get current state
      await loadConfiguration();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="configuration-page">
        <Loading text="Updating configuration..." />
      </div>
    );
  }

  return (
    <div className="configuration-page">
      <h2>System Configuration</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <div className="config-section">
        <h3>Current Configuration</h3>
        <div className="current-config">
          <strong>{configLabel || `${storageType} via ${accessMethod}`}</strong>
        </div>
      </div>

      <div className="config-section">
        <h3>Storage Type</h3>
        <div className="storage-options">
          <div className="storage-option">
            <input
              type="radio"
              id="mysql"
              name="storageType"
              value="mysql"
              checked={storageType === 'mysql'}
              onChange={() => handleConfigurationChange('mysql', undefined)}
            />
            <label htmlFor="mysql">
              <strong>MySQL Database</strong>
              <p>Traditional relational database storage</p>
            </label>
          </div>

          <div className="storage-option">
            <input
              type="radio"
              id="parquet"
              name="storageType"
              value="parquet"
              checked={storageType === 'parquet'}
              onChange={() => handleConfigurationChange('parquet', undefined)}
            />
            <label htmlFor="parquet">
              <strong>Parquet Files</strong>
              <p>Efficient columnar storage format for analytics</p>
            </label>
          </div>

          <div className="storage-option">
            <input
              type="radio"
              id="delta"
              name="storageType"
              value="delta"
              checked={storageType === 'delta'}
              onChange={() => handleConfigurationChange('delta', undefined)}
            />
            <label htmlFor="delta">
              <strong>Delta Table Format</strong>
              <p>ACID-compliant storage with Parquet files and transaction logs</p>
            </label>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Data Access Method</h3>
        <div className="access-method-options">
          <div className="access-method-option">
            <input
              type="radio"
              id="direct"
              name="accessMethod"
              value="direct"
              checked={accessMethod === 'direct'}
              onChange={() => handleConfigurationChange(undefined, 'direct')}
            />
            <label htmlFor="direct">
              <strong>Direct Access</strong>
              <p>Direct library access (mysql2, fs modules)</p>
            </label>
          </div>

          <div className="access-method-option">
            <input
              type="radio"
              id="sparksession"
              name="accessMethod"
              value="sparksession"
              checked={accessMethod === 'sparksession'}
              onChange={() => handleConfigurationChange(undefined, 'sparksession')}
            />
            <label htmlFor="sparksession">
              <strong>SparkSession ⚠️</strong>
              <p>Apache Spark unified SQL interface (read-only) - Requires Spark installation</p>
              <p style={{color: '#856404', fontSize: '0.85em', marginTop: '5px', fontStyle: 'italic'}}>
                Note: Currently unavailable - Spark binaries not installed in backend container
              </p>
            </label>
          </div>
        </div>
      </div>

      <div className="config-section">
        <div className="storage-info">
          <h4>About Your Configuration</h4>
          <p className="storage-description">
            {storageType === 'mysql' 
              ? 'MySQL is a traditional relational database ideal for transactional data and real-time operations.'
              : storageType === 'parquet'
              ? 'Parquet files provide efficient columnar storage optimized for analytical queries and big data workloads.'
              : 'Delta Table Format combines Parquet files with transaction logs for ACID compliance, versioning, and time travel.'}
          </p>
          <p className="access-description">
            {accessMethod === 'direct'
              ? 'Direct access uses native Node.js libraries for maximum write performance and simplicity.'
              : 'SparkSession provides a unified SQL interface via Apache Spark in local mode. Currently read-only.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;