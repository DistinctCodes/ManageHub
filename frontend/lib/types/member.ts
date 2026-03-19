export type UserRole = "USER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface MembersResponse {
  members: Member[];
  totalPages: number;
  currentPage: number;
}

export interface MemberStats {
  total: number;
  active: number;
  suspended: number;
  newThisMonth: number;
}