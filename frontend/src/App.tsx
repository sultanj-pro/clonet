import React, { useState } from 'react';

import UserList from './components/UserList';
import ConfigurationPage from './components/ConfigurationPage';
import ClonePage from './components/ClonePage';
import './App.css';


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'config' | 'clone'>('home');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Clonet Dashboard</h1>
        <nav className="App-nav">
          <button 
            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
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
        </nav>
      </header>
      <main>
        {currentPage === 'home' && (
          <div>
            {/* Home page will show job status/history in future */}
            <h2>Job Status Dashboard</h2>
            <p>View all jobs ran and running here.</p>
          </div>
        )}
        {currentPage === 'config' && <ConfigurationPage />}
        {currentPage === 'clone' && <ClonePage />}
      </main>
    </div>
  );
};

export default App;