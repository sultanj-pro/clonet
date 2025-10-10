import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User, UserInput } from '../types';

interface EditUserFormProps {
  user: User;
  onSave: (userId: number, userData: UserInput) => Promise<void>;
  onCancel: () => void;
  onDelete: (userId: number) => Promise<void>;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<UserInput>({
    name: user.name || '',
    email: user.email || '',
    role: user.role,
  });
  const [error, setError] = useState<string>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await onSave(user.id, formData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-user-form">
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="form-control"
          required
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Save</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button 
          type="button" 
          onClick={() => onDelete(user.id)}
          className="btn btn-danger"
        >
          Delete
        </button>
      </div>
    </form>
  );
};

export default EditUserForm;