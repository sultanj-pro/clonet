import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ConfigurationPage from './components/ConfigurationPage';
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
              to="/configuration" 
              className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
            >
              Configuration
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
            <Route path="/" element={
              <div>
                <h2>Job Status Dashboard</h2>
                <p>View all jobs ran and running here.</p>
              </div>
            } />
            <Route path="/configuration/*" element={<ConfigurationPage />} />
            <Route path="/clone" element={<ClonePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;