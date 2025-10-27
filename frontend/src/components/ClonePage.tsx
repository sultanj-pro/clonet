import React, { useEffect, useState } from 'react';
import { testConnection as testConnectionAPI, executeClone, DatabaseConfig } from '../services/cloneApi';
import { getConnections, ConnectionConfig } from '../services/connectionsApi';
import './ClonePage.css';

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

const ClonePage: React.FC = () => {
  const [savedConnections, setSavedConnections] = useState<ConnectionConfig[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);
  const [sourceConfig, setSourceConfig] = useState<DatabaseConfig | null>(null);
  const [destinationConfig, setDestinationConfig] = useState<DatabaseConfig | null>(null);
  const [sourceStatus, setSourceStatus] = useState<ConnectionStatus>({ connected: false });
  const [destinationStatus, setDestinationStatus] = useState<ConnectionStatus>({ connected: false });
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>({ mode: 'overwrite', batchSize: 10000 });
  const [cloneInProgress, setCloneInProgress] = useState(false);
  const [cloneResult, setCloneResult] = useState<string>('');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoadingConnections(true);
    try {
      const conns = await getConnections();
      setSavedConnections(conns.map(c => ({ ...c, database: (c as any).db_name || (c as any).database })));
    } catch (err) {
      console.error('Failed to load connections', err);
    } finally {
      setLoadingConnections(false);
    }
  };

  const buildConfigFromConnection = (conn: ConnectionConfig): DatabaseConfig => ({
    type: (conn as any).type || 'mysql',
    host: (conn as any).host || '',
    port: (conn as any).port || 3306,
    database: (conn as any).db_name || (conn as any).database || '',
    username: (conn as any).username || '',
    password: (conn as any).password || '',
    table: ''
  });

  const handleSelectConnection = async (connectionId: number | null, isSource: boolean) => {
    if (!connectionId) {
      if (isSource) {
        setSelectedSourceId(null);
        setSourceConfig(null);
        setSourceStatus({ connected: false });
      } else {
        setSelectedDestId(null);
        setDestinationConfig(null);
        setDestinationStatus({ connected: false });
      }
      return;
    }

    const conn = savedConnections.find(c => c.id === connectionId);
    if (!conn) return;

    const config = buildConfigFromConnection(conn);

    if (isSource) {
      setSelectedSourceId(connectionId);
      setSourceConfig(config);
      setSourceStatus({ connected: false, testing: true });
    } else {
      setSelectedDestId(connectionId);
      setDestinationConfig(config);
      setDestinationStatus({ connected: false, testing: true });
    }

    try {
      const res = await testConnectionAPI(config);
      if (res && res.success) {
        const status = { connected: true, tables: res.tables || [], testing: false };
        if (isSource) setSourceStatus(status);
        else setDestinationStatus(status);
      } else {
        throw new Error((res as any).message || 'Connection test failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isSource) {
        setSourceStatus({ connected: false, error: `Connection failed: ${message}. Please fix in Configuration or choose another connection.`, testing: false });
        setSelectedSourceId(null);
        setSourceConfig(null);
      } else {
        setDestinationStatus({ connected: false, error: `Connection failed: ${message}. Please fix in Configuration or choose another connection.`, testing: false });
        setSelectedDestId(null);
        setDestinationConfig(null);
      }
    }
  };

  const startClone = async () => {
    setCloneResult('');
    if (!selectedSourceId || !selectedDestId) {
      setCloneResult('❌ Error: Please select both source and destination connections');
      return;
    }
    if (!sourceConfig || !sourceConfig.table) {
      setCloneResult('❌ Error: Please select a source table');
      return;
    }

    const destTableName = (destinationConfig && destinationConfig.table) || `${sourceConfig.table}_copy`;
    setCloneInProgress(true);
    setCloneResult('Validating connections...');

    try {
      const sres = await testConnectionAPI(sourceConfig);
      if (!sres.success) throw new Error('Source connection validation failed');
      
      const dConfigForTest = destinationConfig || buildConfigFromConnection(savedConnections.find(c => c.id === selectedDestId)!);
      const dres = await testConnectionAPI(dConfigForTest);
      if (!dres.success) throw new Error('Destination connection validation failed');

      setCloneResult(`Connections validated. Cloning ${sourceConfig.table} → ${destTableName}...`);

      const resp = await executeClone({ 
        source: sourceConfig, 
        destination: { ...(destinationConfig || dConfigForTest), table: destTableName }, 
        options: cloneOptions 
      });
      
      if (resp && resp.success) {
        setCloneResult(`✅ Successfully cloned ${resp.rowsCloned || 0} rows in ${resp.duration?.toFixed(2) || '0'}s`);
        setDestinationConfig({ ...(destinationConfig || dConfigForTest), table: destTableName });
      } else {
        throw new Error((resp && resp.message) || 'Clone failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCloneResult(`❌ Error: ${message}`);
    } finally {
      setCloneInProgress(false);
    }
  };

  return (
    <div className="clone-page">
      <div className="clone-header">
        <h2>Clone Database Data</h2>
        <p>Select source and destination connections to configure a clone operation.</p>
      </div>

      {!loadingConnections && savedConnections.length === 0 && (
        <div className="no-connections-message">
          ℹ️ No saved connections found. <a href="/configuration" target="_blank" rel="noopener noreferrer">Create a connection</a> before configuring cloning.
        </div>
      )}

      <div className="clone-grid">
        <div className="clone-column source-column">
          <h3>📥 Source</h3>
          <p className="column-description">Select existing connection to read data from</p>

          <div className="form-group">
            <label htmlFor="source-connection">Connection</label>
            <select 
              id="source-connection" 
              value={selectedSourceId || ''} 
              onChange={e => handleSelectConnection(Number(e.target.value) || null, true)} 
              disabled={loadingConnections}
            >
              <option value="">-- Select source connection --</option>
              {savedConnections.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({(c as any).type || 'mysql'} - {c.host})</option>
              ))}
            </select>
          </div>

          {sourceStatus.testing && <div className="status-testing">⏳ Testing connection...</div>}
          {sourceStatus.connected && <div className="status-success">✅ Connected</div>}
          {sourceStatus.error && <div className="status-error">❌ {sourceStatus.error}</div>}

          {sourceStatus.connected && sourceStatus.tables && (
            <div className="form-group">
              <label htmlFor="source-table">Select Table</label>
              <select 
                id="source-table" 
                value={sourceConfig?.table || ''} 
                onChange={e => setSourceConfig(prev => prev ? { ...prev, table: e.target.value } : prev)}
              >
                <option value="">-- Select a table --</option>
                {sourceStatus.tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {selectedSourceId && sourceStatus.connected && sourceConfig && (
            <div className="connection-info">
              <strong>Source:</strong> {sourceConfig.host}:{sourceConfig.port}/{sourceConfig.database} ({sourceConfig.username})
            </div>
          )}
        </div>

        <div className="clone-column destination-column">
          <h3>📤 Destination</h3>
          <p className="column-description">Select existing connection to write data to</p>

          <div className="form-group">
            <label htmlFor="dest-connection">Connection</label>
            <select 
              id="dest-connection" 
              value={selectedDestId || ''} 
              onChange={e => handleSelectConnection(Number(e.target.value) || null, false)} 
              disabled={loadingConnections}
            >
              <option value="">-- Select destination connection --</option>
              {savedConnections.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({(c as any).type || 'mysql'} - {c.host})</option>
              ))}
            </select>
          </div>

          {destinationStatus.testing && <div className="status-testing">⏳ Testing connection...</div>}
          {destinationStatus.connected && <div className="status-success">✅ Connected</div>}
          {destinationStatus.error && <div className="status-error">❌ {destinationStatus.error}</div>}

          {destinationStatus.connected && (
            <div className="form-group">
              <label htmlFor="dest-table">Destination Table Name</label>
              <input 
                id="dest-table" 
                type="text" 
                value={destinationConfig?.table || ''} 
                onChange={e => setDestinationConfig(prev => prev ? { ...prev, table: e.target.value } : prev)} 
                placeholder={sourceConfig?.table ? `${sourceConfig.table}_copy` : 'Enter table name'} 
              />
              <small className="hint">Leave empty to use: <strong>{sourceConfig?.table ? `${sourceConfig.table}_copy` : 'source_table_copy'}</strong></small>
            </div>
          )}

          {selectedDestId && destinationStatus.connected && destinationConfig && (
            <div className="connection-info">
              <strong>Destination:</strong> {destinationConfig.host}:{destinationConfig.port}/{destinationConfig.database} ({destinationConfig.username})
            </div>
          )}
        </div>
      </div>

      {/* Clone Button - Prominent placement */}
      {sourceStatus.connected && destinationStatus.connected && sourceConfig?.table && (
        <div className="clone-button-wrapper">
          <button 
            className="start-clone-button" 
            onClick={startClone} 
            disabled={cloneInProgress}
          >
            {cloneInProgress ? '⏳ Cloning in Progress...' : '▶ Start Clone Operation'}
          </button>
        </div>
      )}

      {/* Merged Options Panel - Two Columns */}
      {sourceStatus.connected && destinationStatus.connected && (
        <div className="clone-options-panel">
          <div className="options-column">
            <h3>⚙️ Clone Options</h3>
            <p className="column-description">Configure how data will be cloned</p>
            
            <div className="options-grid">
              <div className="form-group">
                <label htmlFor="clone-mode">Write Mode</label>
                <select 
                  id="clone-mode" 
                  value={cloneOptions.mode} 
                  onChange={e => setCloneOptions({ ...cloneOptions, mode: e.target.value as any })}
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
                  onChange={e => setCloneOptions({ ...cloneOptions, batchSize: parseInt(e.target.value || '10000') })} 
                  min={1000} 
                  max={100000} 
                  step={1000} 
                />
                <small className="hint">Rows per batch (1,000 - 100,000)</small>
              </div>
            </div>
          </div>

          <div className="options-column" style={{ borderTopColor: '#17a2b8' }}>
            <h3>📊 Clone Status</h3>
            <p className="column-description">Monitor the cloning operation</p>
            
            {cloneResult ? (
              <div className={`clone-result ${cloneResult.includes('❌') || cloneResult.includes('Error') ? 'error' : cloneResult.includes('✅') ? 'success' : ''}`}>
                {cloneResult}
              </div>
            ) : (
              <div className="status-placeholder">
                <p>Click "Start Clone Operation" to begin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClonePage;