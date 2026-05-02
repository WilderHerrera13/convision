export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'specialist' | 'receptionist' | 'super_admin';
  feature_flags?: string[];
  created_at?: string;
  updated_at?: string;
}
