import { API_BASE_URL } from '../config/api';
import { DatabaseConfig } from './cloneApi';

export interface ConnectionConfig extends DatabaseConfig {
  id?: number;
  name: string;
  db_name?: string;
}

export const getConnections = async (): Promise<ConnectionConfig[]> => {
  const response = await fetch(`${API_BASE_URL}/connections`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch connections');
  return response.json();
};

export const addConnection = async (config: ConnectionConfig): Promise<{ id: number }> => {
  const response = await fetch(`${API_BASE_URL}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Failed to add connection');
  return response.json();
};

export const updateConnection = async (id: number, config: ConnectionConfig): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Failed to update connection');
};

export const deleteConnection = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete connection');
};

export const testConnection = async (config: Omit<ConnectionConfig, 'id' | 'name'>): Promise<{ success: boolean; message?: string; tables?: string[] }> => {
  const response = await fetch(`${API_BASE_URL}/connections/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(config),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Connection test failed'
    };
  }
  
  return data;
};