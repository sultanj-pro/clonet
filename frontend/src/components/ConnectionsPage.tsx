// ANALYSIS: Reviewing add connection payload and form validation for username field.
// ANALYSIS: Add Connection logic is handled below. Reviewing for error source.
// TODO: Review the Add Connection logic here for troubleshooting the 'Failed to add connection' error.
import React, { useState, useEffect } from 'react';
import ConnectionDialog from './ConnectionDialog';
import './ConnectionsPage.css';
import { DatabaseConfig, DatabaseType, testConnection } from '../services/cloneApi';
import { getConnections, addConnection, updateConnection, deleteConnection } from '../services/connectionsApi';

// ...existing code...
import { ConnectionConfig } from '../services/connectionsApi';

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
  useEffect(() => {
    getConnections()
      .then(data => {
        console.log('Backend response for connections:', data); // Log backend response for investigation
        // Remap backend fields to frontend fields
        const mapped = data.map(conn => ({
          ...conn,
          database: conn.db_name || conn.database || '',
          username: conn.username || conn.user || '',
        }));
        setConnections(mapped);
      })
      .catch(() => setConnections([]));
  }, []);
  const [form, setForm] = useState<ConnectionConfig>(defaultConfig);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<ConnectionConfig | null>(null);
  const [testStatus, setTestStatus] = useState<{[key: number]: string}>({});
  const [newTestStatus, setNewTestStatus] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
  setForm((prev: ConnectionConfig) => ({ ...prev, [name]: name === 'port' ? Number(value) : value }));
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (connections.some((c, i) => c.name === form.name && i !== editingIndex)) {
      alert('Connection name must be unique.');
      return;
    }
    try {
      if (editingIndex !== null) {
        const id = (connections[editingIndex] as any).id;
        await updateConnection(id, form);
        const updated = [...connections];
        updated[editingIndex] = { ...form, id };
        setConnections(updated);
        setEditingIndex(null);
      } else {
        const result = await addConnection(form);
        setConnections([...connections, { ...form, id: result.id }]);
      }
      setForm(defaultConfig);
    } catch (err) {
      alert('Failed to save connection');
    }
  };

  const handleEdit = (idx: number) => {
    setEditForm(connections[idx]);
    setEditingIndex(idx);
    setShowEditDialog(true);
  };
  const handleCancelEdit = () => {
    setForm(defaultConfig);
    setEditingIndex(null);
    setNewTestStatus('');
  };

  const handleDelete = async (idx: number) => {
    const id = (connections[idx] as any).id;
    try {
      await deleteConnection(id);
      const updated = connections.filter((_, i) => i !== idx);
      setConnections(updated);
      if (editingIndex === idx) {
        setForm(defaultConfig);
        setEditingIndex(null);
      }
    } catch (err) {
      alert('Failed to delete connection');
    }
  };

  // ...existing code...

  return (
    <div className="connections-page-container">
      <h2>Manage Connections</h2>
      <button onClick={() => setShowAddDialog(true)} className="add-connection-btn">Add Connection</button>
      <table className="connections-table">
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
              <td>{conn.db_name || conn.database}</td>
              <td>{conn.user || conn.username}</td>
              <td>
                <button onClick={() => handleEdit(idx)}>Edit</button>
                <button onClick={() => handleDelete(idx)}>Delete</button>
              </td>
              <td>
                <button
                  onClick={async () => {
                    const config = {
                      type: conn.type,
                      host: conn.host,
                      port: conn.port,
                      database: conn.db_name || conn.database,
                      username: conn.user || conn.username,
                      password: conn.password,
                      instanceName: conn.instanceName,
                    };
                    setTestStatus(prev => ({ ...prev, [idx]: 'Testing...' }));
                    try {
                      const result = await testConnection(config);
                      setTestStatus(prev => ({ ...prev, [idx]: result.success ? 'Success' : 'Fail' }));
                    } catch {
                      setTestStatus(prev => ({ ...prev, [idx]: 'Fail' }));
                    }
                  }}
                >Test</button>
                <span className="test-status" style={{ marginLeft: 8 }}>{testStatus[idx]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showAddDialog && (
        <ConnectionDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={async config => {
            try {
              const result = await addConnection(config as any);
              setConnections([...connections, { ...config, id: result.id }]);
              setShowAddDialog(false);
            } catch {
              alert('Failed to add connection');
            }
          }}
        />
      )}
      {showEditDialog && editForm && (
        <ConnectionDialog
          open={showEditDialog}
          initialValues={editForm}
          onClose={() => setShowEditDialog(false)}
          onSave={async config => {
            if (editingIndex !== null) {
              const id = (connections[editingIndex] as any).id;
              try {
                await updateConnection(id, config as any);
                const updated = [...connections];
                updated[editingIndex] = { ...config, id };
                setConnections(updated);
                setShowEditDialog(false);
              } catch {
                alert('Failed to update connection');
              }
            }
          }}
        />
      )}
    </div>
  );

}
export default ConnectionsPage;
