export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'specialist' | 'receptionist' | 'super_admin';
  role_type?: string;
  permissions?: string[];
  feature_flags?: string[];
  must_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}
