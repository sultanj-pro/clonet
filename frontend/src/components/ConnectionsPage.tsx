import React, { useState, useEffect } from 'react';
import { DatabaseConfig, DatabaseType, testConnection } from '../services/cloneApi';

interface ConnectionConfig extends DatabaseConfig {
  name: string;
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

const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  // Load connections from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('db_connections');
    if (saved) {
      setConnections(JSON.parse(saved));
    }
  }, []);

  // Save connections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('db_connections', JSON.stringify(connections));
  }, [connections]);
  const [form, setForm] = useState<ConnectionConfig>(defaultConfig);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [testStatus, setTestStatus] = useState<{[key: number]: string}>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'port' ? Number(value) : value }));
  };

  const handleSave = () => {
    if (!form.name) return;
    // Prevent duplicate names
    if (connections.some((c, i) => c.name === form.name && i !== editingIndex)) {
      alert('Connection name must be unique.');
      return;
    }
    if (editingIndex !== null) {
      const updated = [...connections];
      updated[editingIndex] = form;
      setConnections(updated);
      setEditingIndex(null);
    } else {
      setConnections([...connections, form]);
    }
    setForm(defaultConfig);
  };

  const handleEdit = (idx: number) => {
    setForm(connections[idx]);
    setEditingIndex(idx);
  };

  const handleDelete = (idx: number) => {
    setConnections(connections.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setForm(defaultConfig);
      setEditingIndex(null);
    }
  };

  const handleTestConnection = async (idx: number) => {
    setTestStatus(prev => ({ ...prev, [idx]: 'Testing...' }));
    try {
      const { name, ...configToTest } = connections[idx];
      const result = await testConnection(configToTest);
      if (result.success) {
        setTestStatus(prev => ({ ...prev, [idx]: 'Success' }));
      } else {
        setTestStatus(prev => ({ ...prev, [idx]: 'Failed: ' + (result.message || 'Unknown error') }));
      }
    } catch (err: any) {
      setTestStatus(prev => ({ ...prev, [idx]: 'Failed: ' + (err.message || 'Error') }));
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Manage Connections</h2>
      <div style={{ marginBottom: 24 }}>
        <input name="name" placeholder="Connection Name" value={form.name} onChange={handleChange} />
        <select name="type" value={form.type} onChange={handleChange} aria-label="Database Type">
          <option value="mysql">MySQL</option>
          <option value="sqlserver">SQL Server</option>
        </select>
        <input name="host" placeholder="Host" value={form.host} onChange={handleChange} />
        <input name="port" type="number" placeholder="Port" value={form.port} onChange={handleChange} />
        <input name="database" placeholder="Database" value={form.database} onChange={handleChange} />
        <input name="username" placeholder="Username" value={form.username} onChange={handleChange} />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} />
        {form.type === 'sqlserver' && (
          <input name="instanceName" placeholder="Instance Name (SQL Server)" value={form.instanceName} onChange={handleChange} />
        )}
        <button onClick={handleSave}>{editingIndex !== null ? 'Update' : 'Add'} Connection</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Host</th>
            <th>Port</th>
            <th>Database</th>
            <th>Username</th>
            <th>Actions</th>
            <th>Test</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn, idx) => (
            <tr key={conn.name + idx}>
              <td>{conn.name}</td>
              <td>{conn.type}</td>
              <td>{conn.host}</td>
              <td>{conn.port}</td>
              <td>{conn.database}</td>
              <td>{conn.username}</td>
              <td>
                <button onClick={() => handleEdit(idx)}>Edit</button>
                <button onClick={() => handleDelete(idx)}>Delete</button>
              </td>
              <td>
                <button onClick={() => handleTestConnection(idx)}>Test</button>
                <span style={{ marginLeft: 8 }}>{testStatus[idx]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConnectionsPage;
