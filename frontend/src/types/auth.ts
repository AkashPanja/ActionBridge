export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}
