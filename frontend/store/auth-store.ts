// frontend/src/store/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  membershipType: string;
  role: string;
  status: string;
  emailVerified: boolean;
  profilePicture: string | null;
  stellarWalletAddress: string | null;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  // Registration
  registrationEmail: string | null;
  setRegistrationEmail: (email: string | null) => void;
  clearRegistrationEmail: () => void;

  // Authentication
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: Tokens) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  updateTokens: (tokens: Tokens) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Registration
      registrationEmail: null,
      setRegistrationEmail: (email) => set({ registrationEmail: email }),
      clearRegistrationEmail: () => set({ registrationEmail: null }),

      // Authentication
      user: null,
      tokens: null,
      isAuthenticated: false,

      setAuth: (user, tokens) =>
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

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      updateTokens: (tokens) => set({ tokens }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        registrationEmail: state.registrationEmail,
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Helper hooks
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAccessToken = () =>
  useAuthStore((state) => state.tokens?.accessToken);
