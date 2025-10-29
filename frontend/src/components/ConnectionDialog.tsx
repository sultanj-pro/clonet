import React, { useState } from 'react';
import { addConnection, testConnection, ConnectionConfig } from '../services/connectionsApi';
import { DatabaseType } from '../services/cloneApi';
import './ConnectionDialog.css';
interface ConnectionDialogProps {
  onClose: () => void;
  onSuccess: (connection: ConnectionConfig) => void;
}

const ConnectionDialog: React.FC<ConnectionDialogProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<ConnectionConfig>({
    name: '',
    type: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: ''
  });

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ConnectionConfig, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear test result when form changes
    setTestResult(null);
  };

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type: type as DatabaseType,
      port: type === 'mysql' ? 3306 : 1433
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Connection name is required';
    }
    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Valid port is required (1-65535)';
    }
    if (!formData.database?.trim()) {
      newErrors.database = 'Database name is required';
    }
    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validate()) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection({
        type: formData.type,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        password: formData.password
      });

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed. Please check your settings.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const result = await addConnection(formData);
      onSuccess({ ...formData, id: result.id });
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to save connection. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="connection-dialog">
        <div className="dialog-header">
          <h2>Add New Connection</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="connName">Connection Name *</label>
              <input
                id="connName"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Production MySQL"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="connType">Database Type *</label>
              <select
                id="connType"
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="mysql">MySQL</option>
                <option value="sqlserver">SQL Server</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="connHost">Host *</label>
              <input
                id="connHost"
                type="text"
                value={formData.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="localhost or IP address"
                className={errors.host ? 'error' : ''}
              />
              {errors.host && <span className="error-message">{errors.host}</span>}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="connPort">Port *</label>
              <input
                id="connPort"
                type="number"
                value={formData.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value) || 0)}
                className={errors.port ? 'error' : ''}
              />
              {errors.port && <span className="error-message">{errors.port}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="connDatabase">Database Name *</label>
            <input
              id="connDatabase"
              type="text"
              value={formData.database || ''}
              onChange={(e) => handleChange('database', e.target.value)}
              placeholder="Database name"
              className={errors.database ? 'error' : ''}
            />
            {errors.database && <span className="error-message">{errors.database}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="connUsername">Username *</label>
              <input
                id="connUsername"
                type="text"
                value={formData.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="Database username"
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="connPassword">Password</label>
              <input
                id="connPassword"
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Database password"
              />
            </div>
          </div>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <strong>{testResult.success ? '✓ Success!' : '✗ Failed'}</strong>
              {testResult.message && <p>{testResult.message}</p>}
            </div>
          )}

          {errors.submit && (
            <div className="error-banner">{errors.submit}</div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <div className="footer-actions">
            <button 
              className="btn-test" 
              onClick={handleTest}
              disabled={testing || saving}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={testing || saving}
            >
              {saving ? 'Saving...' : 'Save Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDialog;
