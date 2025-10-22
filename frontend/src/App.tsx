import React, { useState } from 'react';
import UserList from './components/UserList';
import ConfigurationPage from './components/ConfigurationPage';
import ClonePage from './components/ClonePage';
import './App.css';

import ConnectionsPage from './components/ConnectionsPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'users' | 'config' | 'clone' | 'connections'>('users');

  return (
    <div className="App">
      <header className="App-header">
        <h1>User Management</h1>
        <nav className="App-nav">
          <button 
            className={`nav-button ${currentPage === 'users' ? 'active' : ''}`}
            onClick={() => setCurrentPage('users')}
          >
            Users
          </button>
          <button 
            className={`nav-button ${currentPage === 'config' ? 'active' : ''}`}
            onClick={() => setCurrentPage('config')}
          >
            Configuration
          </button>
          <button 
            className={`nav-button ${currentPage === 'clone' ? 'active' : ''}`}
            onClick={() => setCurrentPage('clone')}
          >
            Clone
          </button>
          <button 
            className={`nav-button ${currentPage === 'connections' ? 'active' : ''}`}
            onClick={() => setCurrentPage('connections')}
          >
            Connections
          </button>
        </nav>
      </header>
      <main>
        {currentPage === 'users' && <UserList />}
        {currentPage === 'config' && <ConfigurationPage />}
        {currentPage === 'clone' && <ClonePage />}
        {currentPage === 'connections' && <ConnectionsPage />}
      </main>
    </div>
  );
};

export default App;