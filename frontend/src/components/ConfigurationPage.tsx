import React, { useState, useEffect } from 'react';
import { getStorageConfig, updateStorageConfig } from '../services';
import Loading from './Loading';
import './ConfigurationPage.css';

const ConfigurationPage: React.FC = () => {
  const [storageType, setStorageType] = useState<'mysql' | 'parquet' | 'delta'>('mysql');
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
      setError('');
    } catch (err) {
      setError('Failed to load configuration');
      console.error('Error loading configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStorageTypeChange = async (newType: 'mysql' | 'parquet' | 'delta') => {
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
      
      if (newType === 'parquet') {
        setSuccessMessage('Initializing Parquet storage (this may take up to a minute)...');
      } else if (newType === 'delta') {
        setSuccessMessage('Initializing Delta Table Format storage (this may take up to a minute)...');
      } else {
        setSuccessMessage('Switching to MySQL storage...');
      }

      await updateStorageConfig({ type: newType });
      setStorageType(newType);
      setSuccessMessage(`Successfully switched to ${newType} storage`);
      
      // Reload configuration to verify the change
      await loadConfiguration();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update storage configuration';
      setError(errorMessage);
      console.error('Error updating storage type:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="configuration-page">
        <Loading text={
          storageType === 'parquet' 
            ? 'Initializing Parquet storage (this may take a few seconds)...'
            : storageType === 'delta'
            ? 'Initializing Delta Table Format storage (this may take a few seconds)...'
            : 'Updating configuration...'
        } />
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
        <h3>Storage Configuration</h3>
        <div className="storage-options">
          <div className="storage-option">
            <input
              type="radio"
              id="mysql"
              name="storageType"
              value="mysql"
              checked={storageType === 'mysql'}
              onChange={() => handleStorageTypeChange('mysql')}
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
              onChange={() => handleStorageTypeChange('parquet')}
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
              onChange={() => handleStorageTypeChange('delta')}
            />
            <label htmlFor="delta">
              <strong>Delta Table Format</strong>
              <p>ACID-compliant storage with Parquet files and transaction logs</p>
            </label>
          </div>
        </div>

        <div className="storage-info">
          <h4>Current Storage: {
            storageType === 'mysql' ? 'MySQL Database' : 
            storageType === 'parquet' ? 'Parquet Files' : 
            'Delta Table Format'
          }</h4>
          <p className="storage-description">
            {storageType === 'mysql' 
              ? 'Using MySQL for traditional relational database storage. Ideal for transactional data and real-time operations.'
              : storageType === 'parquet'
              ? 'Using Parquet files for efficient data storage. Optimized for analytical queries and big data workloads.'
              : 'Using Delta Table Format for ACID-compliant data storage. Combines Parquet files with transaction logs for versioning and time travel capabilities.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;