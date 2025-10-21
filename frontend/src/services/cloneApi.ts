import { API_BASE_URL } from '../config/api';

export type DatabaseType = 'mysql' | 'sqlserver';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  table?: string;
  // SQL Server specific fields
  instanceName?: string;
}

// Keep legacy interface for backward compatibility
export interface MySQLConfig extends Omit<DatabaseConfig, 'type' | 'instanceName'> {
  type?: 'mysql';
}

export interface TestConnectionResponse {
  success: boolean;
  tables: string[];
  message?: string;
}

export interface CloneOptions {
  mode: 'overwrite' | 'append';
  batchSize: number;
}

export interface CloneRequest {
  source: DatabaseConfig;
  destination: DatabaseConfig;
  options: CloneOptions;
}

export interface CloneResponse {
  success: boolean;
  jobId: string;
  rowsCloned?: number;
  message: string;
  duration?: number;
}

export interface SchemaInfo {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  rowCount?: number;
}

export const testConnection = async (config: DatabaseConfig): Promise<TestConnectionResponse> => {
  const url = `${API_BASE_URL}/clone/test-connection`;
  console.log('testConnection API called');
  console.log('URL:', url);
  console.log('Config being sent:', config);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  console.log('Response status:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json();
    console.error('Response error:', error);
    throw new Error(error.message || 'Connection test failed');
  }

  const result = await response.json();
  console.log('Response data:', result);
  return result;
};

export const getSchema = async (config: DatabaseConfig): Promise<SchemaInfo> => {
  const response = await fetch(`${API_BASE_URL}/clone/get-schema`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get schema');
  }

  return response.json();
};

export const executeClone = async (request: CloneRequest): Promise<CloneResponse> => {
  const response = await fetch(`${API_BASE_URL}/clone/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Clone operation failed');
  }

  return response.json();
};

export const getCloneStatus = async (jobId: string): Promise<CloneResponse> => {
  const response = await fetch(`${API_BASE_URL}/clone/status/${jobId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get clone status');
  }

  return response.json();
};
