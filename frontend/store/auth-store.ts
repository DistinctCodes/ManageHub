// frontend/src/store/auth-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  emailVerified: boolean;
  biometricRegistered?: boolean;
  membershipType?: string;
  profilePicture?: string | null;
  stellarWalletAddress?: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  tokenExpiresAt: number | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  registrationEmail: string | null;
  setRegistrationEmail: (email: string | null) => void;
  clearRegistrationEmail: () => void;
}

// Helper functions for cookie management
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof window === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

const deleteCookie = (name: string) => {
  if (typeof window === "undefined") return;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      tokenExpiresAt: null,

      registrationEmail: null,
      setRegistrationEmail: (email) => set({ registrationEmail: email }),
      clearRegistrationEmail: () => set({ registrationEmail: null }),

      setAuth: (accessToken: string, refreshToken: string, user: User) => {
        // Calculate token expiry (7 days from now)
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        console.log("Setting auth:", { accessToken, refreshToken, user }); // Debug

        // Set cookies for middleware
        setCookie("auth_token", accessToken, 7);
        setCookie("user_data", JSON.stringify(user), 7);

        // Update store
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          tokenExpiresAt: expiresAt,
        });

        console.log("Auth set successfully"); // Debug
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user, ...userData };

          // Update cookie
          setCookie("user_data", JSON.stringify(updatedUser), 7);

          return {
            user: updatedUser,
          };
        });
      },

      clearAuth: () => {
        console.log("Clearing auth"); // Debug

        // Clear cookies
        deleteCookie("auth_token");
        deleteCookie("user_data");

        // Clear store
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          tokenExpiresAt: null,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Selectors
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useUser = () => useAuthStore((state) => state.user);
export const useToken = () => useAuthStore((state) => state.accessToken);
export const useRefreshToken = () =>
  useAuthStore((state) => state.refreshToken);
