import React from 'react';
import UserList from './components/UserList';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>User Management</h1>
      </header>
      <main>
        <UserList />
      </main>
    </div>
  );
};

export default App;