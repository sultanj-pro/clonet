import { API_BASE_URL } from '../config/api';

export interface JobData {
  name: string;
  description: string;
  source_connection_id: number;
  destination_connection_id: number;
  tables: string[];
  write_mode: 'overwrite' | 'append';
  batch_size: number;
}

export interface Job extends JobData {
  id: number;
  created_at: string;
  updated_at: string;
}

export const createJob = async (jobData: JobData): Promise<Job> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    throw new Error('Failed to create job');
  }

  return response.json();
};

export const getJobs = async (): Promise<Job[]> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs`);

  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }

  return response.json();
};

export const getJobById = async (id: number): Promise<Job> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch job');
  }

  return response.json();
};

export const deleteJob = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete job');
  }
};

export const testRunJob = async (jobData: JobData): Promise<{ success: boolean; message: string; result?: any }> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/test-run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    throw new Error('Failed to test run job');
  }

  return response.json();
};

export const runJob = async (id: number): Promise<{ success: boolean; message: string; result?: any }> => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${id}/run`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to run job');
  }

  return response.json();
};
