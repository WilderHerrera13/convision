export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'specialist' | 'receptionist';
  created_at?: string;
  updated_at?: string;
} 