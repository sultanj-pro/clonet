import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './components/HomePage';
import ConfigurationPage from './components/ConfigurationPage';
import JobsPage from './components/JobsPage';
import ClonePage from './components/ClonePage';
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Clonet Dashboard</h1>
          <nav className="App-nav">
            <NavLink 
              to="/" 
              className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
              end
            >
              Home
            </NavLink>
            <NavLink 
              to="/connections" 
              className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
            >
              Connections
            </NavLink>
            <NavLink 
              to="/jobs" 
              className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
            >
              Jobs
            </NavLink>
            <NavLink 
              to="/clone" 
              className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
            >
              Clone
            </NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/connections" element={<ConfigurationPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/clone" element={<ClonePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;