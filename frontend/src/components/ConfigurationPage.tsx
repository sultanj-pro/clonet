import ConnectionsPage from './ConnectionsPage';
import React, { useState } from 'react';

const ConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'connections' | 'jobs'>('settings');

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
            <h3>General Application Settings</h3>
            <p>Configure non-database application settings here. (More options coming soon)</p>
          </div>
        )}
        {activeTab === 'connections' && (
          <div>
            <ConnectionsPage />
          </div>
        )}
        {activeTab === 'jobs' && (
          <div>
            <h3>Job Scheduling</h3>
            <p>Configure and manage scheduled jobs here. (Coming soon)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPage;