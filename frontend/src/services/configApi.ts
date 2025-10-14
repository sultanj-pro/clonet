import { API_BASE_URL, defaultOptions } from '../config/api';
import { StorageConfig } from '../types/storage';
import fetchWithTimeout from '../utils/fetchWithTimeout';

// Longer timeout for storage operations (60 seconds)
const STORAGE_TIMEOUT = 60000;

export const getStorageConfig = async (): Promise<StorageConfig> => {
  try {
    const data = await fetchWithTimeout(`${API_BASE_URL}/config/storage`, {
      method: 'GET',
      ...defaultOptions,
      timeout: STORAGE_TIMEOUT
    });
    return data as StorageConfig;
  } catch (error) {
    console.error('Error fetching storage config:', error);
    throw error;
  }
};

export const updateStorageConfig = async (config: StorageConfig): Promise<StorageConfig> => {
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 10000; // 10 seconds

  while (retryCount < maxRetries) {
    try {
      const data = await fetchWithTimeout(`${API_BASE_URL}/config/storage`, {
        method: 'PUT',
        ...defaultOptions,
        body: JSON.stringify(config),
        timeout: STORAGE_TIMEOUT
      });
      return data as StorageConfig;
    } catch (error) {
      retryCount++;
      
      if (retryCount === maxRetries) {
        if (error instanceof Error) {
          if (error.message === 'Request timed out') {
            throw new Error('Storage initialization is still in progress. The process may take a few minutes to complete. Please wait...');
          } else {
            throw new Error(`Failed to update storage configuration: ${error.message}`);
          }
        }
        throw error;
      }

      console.log(`Retry ${retryCount}/${maxRetries} for storage configuration update...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error('Maximum retries exceeded for storage configuration update');
};