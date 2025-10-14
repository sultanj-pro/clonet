import { User, UserInput, ApiError, StorageConfig } from '../types';

const API_BASE_URL = '/api';

// Common fetch options for all API calls
const defaultOptions: RequestInit = {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      ...defaultOptions,
    });
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({ message: 'Failed to fetch users' }));
      throw new Error(errorData.message);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const updateUser = async (userId: number, userData: UserInput): Promise<User> => {
  try {
    console.log('Making update request:', { userId, userData });
    
    const options: RequestInit = {
      method: 'PUT',
      ...defaultOptions,
      body: JSON.stringify(userData),
    };
    console.log('Request options:', options);

    const response = await fetch(`${API_BASE_URL}/users/${userId}`, options);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({ message: `Failed to update user: ${response.status}` }));
      console.error('Error response:', errorData);
      throw new Error(errorData.message);
    }
    
    const data: User = await response.json();
    console.log('Update successful:', data);
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const getUserById = async (userId: number): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'GET',
    ...defaultOptions,
  });
  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ message: 'Failed to fetch user' }));
    throw new Error(errorData.message);
  }
  return response.json();
};

export const createUser = async (userData: UserInput): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      ...defaultOptions,
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({ message: `Failed to create user: ${response.status}` }));
      throw new Error(errorData.message);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<boolean> => {
  try {
    console.log('Deleting user:', userId);
    
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      ...defaultOptions,
    });
    
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({ message: `Failed to delete user: ${response.status}` }));
      console.error('Error response:', errorData);
      throw new Error(errorData.message);
    }
    
    console.log('User deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};