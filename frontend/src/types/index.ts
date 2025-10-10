export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserInput {
  name: string;
  email: string;
  role?: string;
}

export interface ApiError {
  message: string;
  error?: string;
}