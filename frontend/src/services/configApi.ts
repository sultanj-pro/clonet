import { API_BASE_URL, defaultOptions } from '../config/api';
import { StorageConfig } from '../types/storage';

export const getStorageConfig = async (): Promise<StorageConfig> => {
  try {
    const response = await fetch(`${API_BASE_URL}/config/storage`, {
      method: 'GET',
      ...defaultOptions,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch storage configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching storage config:', error);
    throw error;
  }
};

export const updateStorageConfig = async (config: StorageConfig): Promise<StorageConfig> => {
  try {
    const response = await fetch(`${API_BASE_URL}/config/storage`, {
      method: 'PUT',
      ...defaultOptions,
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to update storage configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating storage config:', error);
    throw error;
  }
};