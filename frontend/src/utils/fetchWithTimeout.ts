import { API_BASE_URL, defaultOptions } from '../config/api';

const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    clearTimeout(id);
    return data;
  } catch (error: unknown) {
    clearTimeout(id);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

export default fetchWithTimeout;