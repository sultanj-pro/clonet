import React, { useState, useEffect } from 'react';
import { User, UserInput } from '../types';
import { fetchUsers, updateUser, createUser, deleteUser } from '../services/api';
import EditUserForm from './EditUserForm';
import CreateUserForm from './CreateUserForm';
import './UserList.css';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('Fetching users...');
      const data = await fetchUsers();
      console.log('Users fetched successfully:', data);
      setUsers(data);
      setError('');
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleSave = async (userId: number, userData: UserInput) => {
    try {
      console.log('Updating user:', { userId, userData });
      const updatedUser = await updateUser(userId, userData);
      console.log('Update successful:', updatedUser);
      setUsers(users.map(user => 
        user.id === userId ? updatedUser : user
      ));
      setEditingUser(null);
      setError('');
    } catch (err) {
      console.error('Update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setIsCreating(false);
    setError('');
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingUser(null);
    setError('');
  };

  const handleCreateSave = async (userData: UserInput) => {
    try {
      const newUser = await createUser(userData);
      setUsers([...users, newUser]);
      setIsCreating(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
        setUsers(users.filter(user => user.id !== userId));
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete user');
      }
    }
  };

  return (
    <div className="user-list">
      {error && (
        <div className="error-banner">
          <div className="error-message">{error}</div>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}
      <div className="user-list-header">
        <h2>Users</h2>
        <button 
          className="btn btn-primary create-button"
          onClick={handleCreate}
          title="Add New User"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {isCreating && (
        <CreateUserForm
          onSave={handleCreateSave}
          onCancel={handleCancel}
        />
      )}

      {users.map(user => (
        <div key={user.id} className="user-item">
          <div className="user-actions">
            <button
              className="btn btn-link edit-button"
              onClick={() => handleEdit(user)}
              title="Edit user"
            >
              <i className="fas fa-ellipsis"></i>
            </button>
          </div>
          {editingUser && editingUser.id === user.id ? (
            <EditUserForm
              user={user}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          ) : (
            <div className="user-info">
              <div className="user-details">
                <div><strong>Name:</strong> {user.name}</div>
                <div><strong>Email:</strong> {user.email}</div>
                {user.role && <div><strong>Role:</strong> {user.role}</div>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UserList;