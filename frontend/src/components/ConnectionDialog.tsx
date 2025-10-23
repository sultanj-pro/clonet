import React, { useState } from 'react';
import { DatabaseConfig, testConnection } from '../services/cloneApi';

interface ConnectionConfig extends DatabaseConfig {
  name: string;
  username: string;
}

interface ConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ConnectionConfig) => void;
  initialValues?: ConnectionConfig;
}

const defaultConfig: ConnectionConfig = {
  name: '',
  type: 'mysql',
  host: '',
  port: 3306,
  database: '',
  username: '',
  password: '',
  instanceName: '',
};

const ConnectionDialog: React.FC<ConnectionDialogProps> = ({ open, onClose, onSave, initialValues }) => {
  const [form, setForm] = useState<ConnectionConfig>(initialValues || defaultConfig);
  const [testStatus, setTestStatus] = useState<string>('');
  const [tested, setTested] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<boolean>(false);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'port' ? Number(value) : value }));
    setTested(false);
    setTestStatus('');
    setTestSuccess(false);
  };

  const isFormFilled = form.name && form.type && form.host && form.port && form.database && form.username && form.password;

  const handleTest = async () => {
    setTestStatus('Testing...');
    try {
    const { name, ...configToTest } = form;
    const result = await testConnection({ ...configToTest });
      setTested(true);
      if (result.success) {
        setTestStatus('Success');
        setTestSuccess(true);
      } else {
        setTestStatus('Failed: ' + (result.message || 'Unknown error'));
        setTestSuccess(false);
      }
    } catch (err: any) {
      setTestStatus('Failed: ' + (err.message || 'Error'));
      setTestSuccess(false);
    }
  };

  const handleSave = () => {
    if (testSuccess) {
      onSave(form);
      setForm(defaultConfig);
      setTestStatus('');
      setTested(false);
      setTestSuccess(false);
    }
  };

  return (
    <div className="connection-dialog-overlay">
      <div className="connection-dialog">
        <h3>Add Connection</h3>
        <input name="name" placeholder="Connection Name" value={form.name} onChange={handleChange} />
        <select name="type" value={form.type} onChange={handleChange} aria-label="Database Type">
          <option value="mysql">MySQL</option>
          <option value="sqlserver">SQL Server</option>
        </select>
        <input name="host" placeholder="Host" value={form.host} onChange={handleChange} />
        <input name="port" type="number" placeholder="Port" value={form.port} onChange={handleChange} />
        <input name="database" placeholder="Database" value={form.database} onChange={handleChange} />
        <input
          type="text"
          name="username"
          value={form.username || ''}
          onChange={handleChange}
          required
          placeholder="Username"
          title="Username"
        />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} />
        {form.type === 'sqlserver' && (
          <input name="instanceName" placeholder="Instance Name (SQL Server)" value={form.instanceName} onChange={handleChange} />
        )}
        <div className="connection-dialog-actions">
          <button onClick={handleTest} disabled={!isFormFilled}>Test</button>
          <span className="test-status test-status-margin">{testStatus}</span>
        </div>
        <div className="connection-dialog-actions">
          <button onClick={handleSave} disabled={!testSuccess}>Save</button>
          <button onClick={onClose} className="cancel-btn-margin">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDialog;
