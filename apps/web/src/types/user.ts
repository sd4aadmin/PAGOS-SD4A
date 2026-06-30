export type Role = "ADMIN" | "ENGINEER" | "CLIENT";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  company: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserList = {
  items: User[];
  total: number;
};
