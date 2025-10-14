import React, { useState } from 'react';
import UserList from './components/UserList';
import ConfigurationPage from './components/ConfigurationPage';
import './App.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'users' | 'config'>('users');

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
        </nav>
      </header>
      <main>
        {currentPage === 'users' ? <UserList /> : <ConfigurationPage />}
      </main>
    </div>
  );
};

export default App;