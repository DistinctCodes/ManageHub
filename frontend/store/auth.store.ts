import { create } from "zustand";

export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  verified: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  setAuth: (payload: { user: AuthUser; tokens: AuthTokens }) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,

  setAuth: ({ user, tokens }) =>
    set({
      user,
      tokens,
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
    }),
}));
