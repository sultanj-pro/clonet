import ConnectionsPage from './ConnectionsPage';
import React, { useEffect, useState } from 'react';

const AppDatabaseSettingsForm: React.FC = () => {
  const [form, setForm] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    database: 'app_data',
  });

  React.useEffect(() => {
    // Load persisted Application Database config from backend
    fetch('/api/jdbc')
      .then(res => res.json())
      .then(data => {
        if (data.host && data.port && data.username && data.password && data.database) {
          setForm({
            host: data.host,
            port: data.port,
            username: data.username,
            password: data.password,
            database: data.database,
          });
          setStatus(`Configured for ${data.host}:${data.port}/${data.database}`);
          setConfigured(true);
          setEditMode(false);
        } else {
          setConfigured(false);
        }
      })
      .catch(() => {});
  }, []);
  const [configured, setConfigured] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Not configured');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/jdbc', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Application Database settings saved and validated successfully!');
        setStatus(`Configured for ${form.host}:${form.port}/${form.database}`);
        setConfigured(true);
        setEditMode(false);
      } else {
        setError(data.error || 'Failed to save Application Database settings.');
      }
    } catch (err) {
      let message = 'Unknown error';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err && 'message' in err) {
        message = (err as any).message;
      } else if (typeof err === 'string') {
        message = err;
      }
  setError('Network error: ' + message);
    }
    setLoading(false);
  };

  if (typeof configured !== 'undefined' && configured && typeof editMode !== 'undefined' && !editMode) {
    return (
      <div className="jdbc-configured">
        <div className="app-db-status">
          <strong>Current Application Database:</strong> {status}
        </div>
        <button type="button" className="edit-jdbc-btn" onClick={() => setEditMode(true)}>
          Edit Application Database Settings
        </button>
      </div>
    );
  }
  return (
    <form className="appdb-settings-form" onSubmit={e => e.preventDefault()}>
      <div className="form-row">
        <label htmlFor="appdb-host">Host/Server:</label>
        <input type="text" id="appdb-host" name="host" value={form.host} onChange={handleChange} placeholder="e.g. mysql, sqlserver, or IP" disabled={!editMode} />
      </div>
      <div className="form-row">
        <label htmlFor="appdb-port">Port:</label>
        <input type="number" id="appdb-port" name="port" value={form.port} onChange={handleChange} placeholder="e.g. 3306 or 1433" disabled={!editMode} />
      </div>
      <div className="form-row">
        <label htmlFor="appdb-username">Username:</label>
        <input type="text" id="appdb-username" name="username" value={form.username} onChange={handleChange} placeholder="Database username" disabled={!editMode} />
      </div>
      <div className="form-row">
        <label htmlFor="appdb-password">Password:</label>
        <input type="password" id="appdb-password" name="password" value={form.password} onChange={handleChange} placeholder="Database password" disabled={!editMode} />
      </div>
      <div className="form-row">
        <label htmlFor="appdb-database">Database Name:</label>
        <input type="text" id="appdb-database" name="database" value={form.database} placeholder="Database name" disabled={!editMode} />
      </div>
      <div className="form-actions">
        <button type="button" className="save-jdbc-btn" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application Database Settings'}
        </button>
        <button type="button" className="cancel-jdbc-btn" onClick={() => setEditMode(false)}>
          Cancel
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <div className="app-db-info">
        <p><strong>Application Database:</strong> Use any JDBC-compatible database (e.g., MySQL, SQL Server). Enter the connection details above. The database will be created if it does not exist.</p>
      </div>
    </form>
  );
};

const ConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'connections' | 'jobs'>('settings');
  const [currentJdbcDatabase, setCurrentJdbcDatabase] = useState<string>('');

  useEffect(() => {
    fetch('/api/app-settings/current-jdbc')
      .then(res => res.json())
      .then(data => setCurrentJdbcDatabase(data.currentJdbcDatabase))
      .catch(() => setCurrentJdbcDatabase(''));
  }, []);

  return (
    <div className="configuration-page">
      <h2>Configuration</h2>
      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Application Settings
        </button>
        <button
          className={`config-tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connections
        </button>
        <button
          className={`config-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Job Scheduling
        </button>
      </div>

      <div className="config-content">
        {activeTab === 'settings' && (
          <div>
            <h3>Application Database Settings</h3>
            <div>
              <strong>Current Application Database:</strong> {currentJdbcDatabase || 'Not set'}
            </div>
            <div className="app-db-settings">
              <h4>Application Database Settings</h4>
              <p>Configure JDBC storage for application data (settings, connections, jobs):</p>
              <AppDatabaseSettingsForm />
            </div>
          </div>
        )}
        {activeTab === 'connections' && (
          <div>
            <ConnectionsPage />
          </div>
        )}
        {activeTab === 'jobs' && (
          <div>
            {/* Job Scheduling UI placeholder */}
            <h3>Job Scheduling</h3>
            <p>Configure and manage scheduled jobs here. (Coming soon)</p>
          </div>
        )}
      </div>
    </div>
  );
};

  export default ConfigurationPage;

