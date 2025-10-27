import React from 'react';
import './ConfigurationPage.css';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ConnectionsPage from './ConnectionsPage';

const ConfigurationPage: React.FC = () => {
  return (
    <div className="configuration-page">
      <h2>Configuration</h2>
      <div className="config-tabs">
        <NavLink
          to="/configuration/settings"
          className={({ isActive }) => `config-tab ${isActive ? 'active' : ''}`}
        >
          Application Settings
        </NavLink>
        <NavLink
          to="/configuration/connections"
          className={({ isActive }) => `config-tab ${isActive ? 'active' : ''}`}
        >
          Connections
        </NavLink>
        <NavLink
          to="/configuration/jobs"
          className={({ isActive }) => `config-tab ${isActive ? 'active' : ''}`}
        >
          Job Scheduling
        </NavLink>
      </div>

      <div className="config-content">
        <Routes>
          <Route path="/" element={<Navigate to="/configuration/settings" replace />} />
          <Route path="/settings" element={
            <div>
              <h3>General Application Settings</h3>
              <p>Configure non-database application settings here. (More options coming soon)</p>
            </div>
          } />
          <Route path="/connections" element={
            <div>
              <ConnectionsPage />
            </div>
          } />
          <Route path="/jobs" element={
            <div>
              <h3>Job Scheduling</h3>
              <p>Configure and manage scheduled jobs here. (Coming soon)</p>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
};

export default ConfigurationPage;
