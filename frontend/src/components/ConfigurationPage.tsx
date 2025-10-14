import React, { useState, useEffect } from 'react';
import { getStorageConfig, updateStorageConfig } from '../services';
import './ConfigurationPage.css';

const ConfigurationPage: React.FC = () => {
  const [storageType, setStorageType] = useState<'mysql' | 'parquet'>('mysql');
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

  const handleStorageTypeChange = async (newType: 'mysql' | 'parquet') => {
    try {
      setIsLoading(true);
      await updateStorageConfig({ type: newType });
      setStorageType(newType);
      setSuccessMessage('Storage configuration updated successfully');
      setError('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to update storage configuration');
      console.error('Error updating storage type:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="configuration-page loading">Loading...</div>;
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
        </div>

        <div className="storage-info">
          <h4>Current Storage: {storageType === 'mysql' ? 'MySQL Database' : 'Parquet Files'}</h4>
          <p className="storage-description">
            {storageType === 'mysql' 
              ? 'Using MySQL for traditional relational database storage. Ideal for transactional data and real-time operations.'
              : 'Using Parquet files for efficient data storage. Optimized for analytical queries and big data workloads.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;