import React, { useState } from 'react';
import { testConnection as testConnectionAPI, executeClone, DatabaseConfig, DatabaseType } from '../services/cloneApi';
import './ClonePage.css';

type ConfigTab = 'source' | 'destination';

interface ConnectionStatus {
  connected: boolean;
  tables?: string[];
  error?: string;
  testing?: boolean;
}

interface CloneOptions {
  mode: 'overwrite' | 'append';
  batchSize: number;
}

const getDefaultPort = (dbType: DatabaseType): number => {
  switch (dbType) {
    case 'mysql':
      return 3306;
    case 'sqlserver':
      return 1433;
    default:
      return 3306;
  }
};

const ClonePage: React.FC = () => {
  console.log('ClonePage component rendered');
  
  const [activeTab, setActiveTab] = useState<ConfigTab>('source');
  const [sourceConfig, setSourceConfig] = useState<DatabaseConfig>({
    type: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    table: ''
  });
  const [destinationConfig, setDestinationConfig] = useState<DatabaseConfig>({
    type: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    table: ''
  });
  const [sourceStatus, setSourceStatus] = useState<ConnectionStatus>({ connected: false });
  const [destinationStatus, setDestinationStatus] = useState<ConnectionStatus>({ connected: false });
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>({
    mode: 'overwrite',
    batchSize: 10000
  });
  const [cloneInProgress, setCloneInProgress] = useState(false);
  const [cloneResult, setCloneResult] = useState<string>('');

  const updateSourceField = (field: keyof DatabaseConfig, value: any) => {
    const newConfig = { ...sourceConfig, [field]: value };
    
    // Update port if database type changes
    if (field === 'type') {
      newConfig.port = getDefaultPort(value as DatabaseType);
    }
    
    setSourceConfig(newConfig);
    
    // Reset connection status when config changes
    if (field !== 'table') {
      setSourceStatus({ connected: false });
    }
  };

  const updateDestinationField = (field: keyof DatabaseConfig, value: any) => {
    const newConfig = { ...destinationConfig, [field]: value };
    
    // Update port if database type changes
    if (field === 'type') {
      newConfig.port = getDefaultPort(value as DatabaseType);
    }
    
    setDestinationConfig(newConfig);
    
    // Reset connection status when config changes
    if (field !== 'table') {
      setDestinationStatus({ connected: false });
    }
  };

  const testConnection = async (isSource: boolean) => {
    const config = isSource ? sourceConfig : destinationConfig;
    const setStatus = isSource ? setSourceStatus : setDestinationStatus;
    
    // DEBUG: Enhanced logging - v3.0
    console.log('=== TEST CONNECTION DEBUG v3.0 ===');
    console.log('Testing connection for:', isSource ? 'source' : 'destination');
    console.log('Config values:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password ? '***' : '(empty)',
      table: config.table
    });

    // Validate required fields
    if (!config.host || !config.database || !config.username) {
      console.log('❌ Validation failed - missing required fields');
      console.log('host:', config.host, 'database:', config.database, 'username:', config.username);
      setStatus({ 
        connected: false, 
        error: 'Please fill in all required fields (host, database, username)',
        testing: false 
      });
      return;
    }

    console.log('✅ Validation passed, setting testing state...');
    setStatus({ connected: false, testing: true });

    try {
      console.log('📡 Calling API to test connection...');
      const data = await testConnectionAPI(config);
      console.log('✅ Connection test result:', data);
      
      setStatus({ 
        connected: true, 
        tables: data.tables || [],
        testing: false 
      });
    } catch (error) {
      console.error('Connection test error:', error);
      setStatus({ 
        connected: false, 
        error: error instanceof Error ? error.message : 'Connection failed',
        testing: false 
      });
    }
  };

  const startClone = async () => {
    console.log('Starting clone operation...');
    
    if (!sourceStatus.connected || !destinationStatus.connected) {
      setCloneResult('❌ Error: Please test both source and destination connections first');
      return;
    }

    if (!sourceConfig.table) {
      setCloneResult('❌ Error: Please select a source table');
      return;
    }

    // Determine destination table name
    const destTableName = destinationConfig.table || `${sourceConfig.table}_copy`;
    
    // Warn if cloning to same database with same table name
    if (sourceConfig.host === destinationConfig.host && 
        sourceConfig.database === destinationConfig.database && 
        sourceConfig.table === destTableName) {
      if (!window.confirm('⚠️ Warning: You are about to overwrite the source table with itself. This will use the selected write mode. Continue?')) {
        setCloneInProgress(false);
        return;
      }
    }

    setCloneInProgress(true);
    setCloneResult('Validating connections...');

    try {
      // Re-test source connection
      console.log('Re-testing source connection...');
      const sourceTest = await testConnectionAPI(sourceConfig);
      if (!sourceTest.success) {
        throw new Error('Source connection validation failed');
      }

      // Re-test destination connection
      console.log('Re-testing destination connection...');
      const destTest = await testConnectionAPI(destinationConfig);
      if (!destTest.success) {
        throw new Error('Destination connection validation failed');
      }

      setCloneResult(`Connections validated. Cloning ${sourceConfig.table} → ${destTableName}...`);
      
      console.log('Executing clone operation...');
      const data = await executeClone({
        source: sourceConfig,
        destination: {
          ...destinationConfig,
          table: destTableName
        },
        options: cloneOptions
      });
      
      console.log('Clone operation completed:', data);
      const message = `✅ Successfully cloned ${data.rowsCloned || 0} rows from ${sourceConfig.table} to ${destTableName}`;
      setCloneResult(
        message + (data.duration ? ` in ${data.duration.toFixed(2)}s` : '')
      );
      
      // Update destination config to show the actual table name used
      if (!destinationConfig.table) {
        setDestinationConfig({ ...destinationConfig, table: destTableName });
      }
    } catch (error) {
      console.error('Clone operation failed:', error);
      setCloneResult(`❌ Error: ${error instanceof Error ? error.message : 'Clone failed'}`);
    } finally {
      setCloneInProgress(false);
    }
  };

  const renderConfigForm = (
    config: DatabaseConfig,
    isSource: boolean,
    status: ConnectionStatus,
    updateField: (field: keyof DatabaseConfig, value: any) => void
  ) => {
    const hasRequiredFields = config.host && config.database && config.username;
    
    return (
      <div className="config-form">
        <div className="form-group">
          <label htmlFor={`${isSource ? 'source' : 'dest'}-type`}>Database Type *</label>
          <select
            id={`${isSource ? 'source' : 'dest'}-type`}
            value={config.type}
            onChange={(e) => updateField('type', e.target.value as DatabaseType)}
            disabled={status.testing}
          >
            <option value="mysql">MySQL</option>
            <option value="sqlserver">SQL Server</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor={`${isSource ? 'source' : 'dest'}-host`}>Host *</label>
          <input
            id={`${isSource ? 'source' : 'dest'}-host`}
            type="text"
            value={config.host}
            onChange={(e) => updateField('host', e.target.value)}
            placeholder="localhost or mysql"
            disabled={status.testing}
            className={!config.host ? 'required-field' : ''}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${isSource ? 'source' : 'dest'}-port`}>Port *</label>
          <input
            id={`${isSource ? 'source' : 'dest'}-port`}
            type="number"
            value={config.port}
            onChange={(e) => updateField('port', parseInt(e.target.value))}
            disabled={status.testing}
          />
          <small className="hint">{config.type === 'mysql' ? 'Default: 3306' : 'Default: 1433'}</small>
        </div>
        <div className="form-group">
          <label htmlFor={`${isSource ? 'source' : 'dest'}-database`}>Database *</label>
          <input
            id={`${isSource ? 'source' : 'dest'}-database`}
            type="text"
            value={config.database}
            onChange={(e) => updateField('database', e.target.value)}
            placeholder="database_name"
            disabled={status.testing}
            className={!config.database ? 'required-field' : ''}
          />
        </div>
        {config.type === 'sqlserver' && (
          <div className="form-group">
            <label htmlFor={`${isSource ? 'source' : 'dest'}-instanceName`}>Instance Name</label>
            <input
              id={`${isSource ? 'source' : 'dest'}-instanceName`}
              type="text"
              value={config.instanceName || ''}
              onChange={(e) => updateField('instanceName', e.target.value)}
              placeholder="Optional SQL Server instance"
              disabled={status.testing}
            />
            <small className="hint">Leave empty for default instance</small>
          </div>
        )}
        <div className="form-group">
          <label htmlFor={`${isSource ? 'source' : 'dest'}-username`}>Username *</label>
          <input
            id={`${isSource ? 'source' : 'dest'}-username`}
            type="text"
            value={config.username}
            onChange={(e) => updateField('username', e.target.value)}
            placeholder="username"
            disabled={status.testing}
            className={!config.username ? 'required-field' : ''}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${isSource ? 'source' : 'dest'}-password`}>Password</label>
          <input
            id={`${isSource ? 'source' : 'dest'}-password`}
            type="password"
            value={config.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="password (optional)"
            disabled={status.testing}
          />
          <small className="hint">Leave empty if no password required</small>
        </div>

        {!hasRequiredFields && (
          <div className="validation-message">
            ℹ️ Please fill in all required fields (marked with *)
          </div>
        )}

        <button 
          className="test-connection-button"
          onClick={() => {
            console.log('Test Connection button clicked!', { isSource, config, hasRequiredFields });
            testConnection(isSource);
          }}
          disabled={status.testing || !hasRequiredFields}
        >
          {status.testing ? 'Testing...' : 'Test Connection'}
        </button>

        {status.error && (
          <div className="error-message">
            ❌ {status.error}
          </div>
        )}

        {status.connected && (
          <div className="success-message">
            ✅ Connected successfully
          </div>
        )}

        {status.connected && status.tables && status.tables.length > 0 && (
          <div className="form-group">
            <label htmlFor={`${isSource ? 'source' : 'dest'}-table`}>
              {isSource ? 'Select Table to Clone *' : 'Destination Table Name *'}
            </label>
            {isSource ? (
              <select
                id={`${isSource ? 'source' : 'dest'}-table`}
                value={config.table || ''}
                onChange={(e) => updateField('table', e.target.value)}
              >
                <option value="">-- Select a table --</option>
                {status.tables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  id={`${isSource ? 'source' : 'dest'}-table`}
                  type="text"
                  value={config.table || ''}
                  onChange={(e) => updateField('table', e.target.value)}
                  placeholder={sourceConfig.table ? `${sourceConfig.table}_copy` : 'Enter table name'}
                />
                <small className="hint">
                  💡 Tip: Enter a different name (e.g., <strong>{sourceConfig.table}_copy</strong>) to create a new table, or use the same name to replace the existing table
                </small>
              </>
            )}
            {isSource && (
              <small className="hint">
                Choose which table to clone from the source database
              </small>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="clone-page">
      <div className="clone-header">
        <h2>Clone MySQL Data</h2>
        <p>Clone data from one MySQL database to another using Apache Spark</p>
      </div>

      <div className="clone-tabs">
        <button
          className={`clone-tab ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          Source Configuration
        </button>
        <button
          className={`clone-tab ${activeTab === 'destination' ? 'active' : ''}`}
          onClick={() => setActiveTab('destination')}
        >
          Destination Configuration
        </button>
      </div>

      <div className="clone-content">
        {activeTab === 'source' ? (
          <div className="source-config">
            <h3>Source MySQL Database</h3>
            <p className="config-description">Configure the MySQL database to read data from</p>
            {renderConfigForm(sourceConfig, true, sourceStatus, updateSourceField)}
          </div>
        ) : (
          <div className="destination-config">
            <h3>Destination MySQL Database</h3>
            <p className="config-description">Configure the MySQL database to write data to</p>
            {renderConfigForm(destinationConfig, false, destinationStatus, updateDestinationField)}
          </div>
        )}
      </div>

      {sourceStatus.connected && destinationStatus.connected && (
        <div className="clone-options">
          <h3>Clone Options</h3>
          <div className="options-grid">
            <div className="form-group">
              <label htmlFor="clone-mode">Write Mode</label>
              <select
                id="clone-mode"
                value={cloneOptions.mode}
                onChange={(e) => setCloneOptions({ ...cloneOptions, mode: e.target.value as 'overwrite' | 'append' })}
              >
                <option value="overwrite">Overwrite (drop and recreate table)</option>
                <option value="append">Append (add to existing data)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="batch-size">Batch Size</label>
              <input
                id="batch-size"
                type="number"
                value={cloneOptions.batchSize}
                onChange={(e) => setCloneOptions({ ...cloneOptions, batchSize: parseInt(e.target.value) })}
                min="1000"
                max="100000"
                step="1000"
              />
              <small className="hint">Number of rows to process per batch (1,000 - 100,000)</small>
            </div>
          </div>
        </div>
      )}

      <div className="clone-actions">
        <div className="config-summary">
          <div className="summary-item">
            <strong>Source:</strong> 
            {sourceConfig.host && (
              <span> {sourceConfig.host}:{sourceConfig.port}/{sourceConfig.database}</span>
            )}
            {sourceConfig.table && <div className="table-name">Table: {sourceConfig.table}</div>}
            {sourceStatus.connected && <span className="status-badge connected">✓ Connected</span>}
          </div>
          <div className="summary-arrow">→</div>
          <div className="summary-item">
            <strong>Destination:</strong>
            {destinationConfig.host && (
              <span> {destinationConfig.host}:{destinationConfig.port}/{destinationConfig.database}</span>
            )}
            {(destinationConfig.table || sourceConfig.table) && (
              <div className="table-name">Table: {destinationConfig.table || sourceConfig.table}</div>
            )}
            {destinationStatus.connected && <span className="status-badge connected">✓ Connected</span>}
          </div>
        </div>

        {cloneResult && (
          <div className={`clone-result ${
            cloneResult.includes('❌') || cloneResult.includes('Error') ? 'error' : 
            cloneResult.includes('✅') ? 'success' : ''
          }`}>
            {cloneResult}
          </div>
        )}

        <button 
          className="start-clone-button" 
          onClick={startClone}
          disabled={!sourceStatus.connected || !destinationStatus.connected || !sourceConfig.table || cloneInProgress}
        >
          {cloneInProgress ? 'Cloning in Progress...' : 'Start Clone Operation'}
        </button>
      </div>
    </div>
  );
};

export default ClonePage;
