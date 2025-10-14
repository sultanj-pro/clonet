export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' as RequestCredentials,
  timeout: 30000, // 30 seconds timeout
};