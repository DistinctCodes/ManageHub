import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { AuthState, User, SetAuthPayload } from '../types/user.types';

/**
 * Authentication Store Actions
 */
interface AuthActions {
  setAuth: (data: SetAuthPayload) => void;
  updateUser: (userData: Partial<User>) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * Initial authentication state
 */
const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  tokenExpiresAt: null,
  _hasHydrated: false,
};

/**
 * Cookie configuration constants
 */
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  sameSite: 'strict' as const,
  secure: true,
  path: '/',
};

const ACCESS_TOKEN_COOKIE = 'accessToken';
const USER_DATA_COOKIE = 'authUser';

/**
 * Sync authentication data to cookies
 * Called when auth state is updated
 */
const syncToCookies = (accessToken: string, user: User): void => {
  // Sync access token to cookie
  Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, COOKIE_OPTIONS);
  
  // Sync user data to cookie (stringified JSON)
  Cookies.set(USER_DATA_COOKIE, JSON.stringify(user), COOKIE_OPTIONS);
};

/**
 * Remove authentication cookies
 * Called during logout/clearAuth
 */
const removeAuthCookies = (): void => {
  Cookies.remove(ACCESS_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(USER_DATA_COOKIE, { path: '/' });
};

/**
 * Global Authentication Store
 * 
 * Features:
 * - Persistent storage using localStorage
 * - Cookie synchronization for SSR/middleware
 * - Hydration tracking to prevent Next.js mismatches
 * - Optimized selectors for minimal re-renders
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set authentication state
       * Automatically calculates tokenExpiresAt and syncs to cookies
       * 
       * @param data - Auth payload with tokens, user, and optional expiresIn
       */
      setAuth: (data: SetAuthPayload) => {
        const { accessToken, refreshToken, user, expiresIn } = data;

        // Calculate token expiration timestamp
        // If expiresIn provided (in seconds), convert to timestamp
        // Otherwise set to 7 days from now (matching cookie expiry)
        const tokenExpiresAt = expiresIn
          ? Date.now() + expiresIn * 1000
          : Date.now() + 7 * 24 * 60 * 60 * 1000;

        // Sync tokens and user data to cookies for SSR/middleware access
        syncToCookies(accessToken, user);

        // Update Zustand state
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          tokenExpiresAt,
        });
      },

      /**
       * Update user data only
       * Merges partial user updates and re-syncs cookies
       * 
       * @param userData - Partial user object to merge
       */
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        const currentToken = get().accessToken;

        if (!currentUser) {
          console.warn('Cannot update user: no user is authenticated');
          return;
        }

        // Merge user updates
        const updatedUser = { ...currentUser, ...userData };

        // Re-sync updated user to cookies if token exists
        if (currentToken) {
          syncToCookies(currentToken, updatedUser);
        }

        // Update Zustand state
        set({ user: updatedUser });
      },

      /**
       * Clear authentication state
       * Removes all cookies and resets state to initial values
       */
      clearAuth: () => {
        // Remove auth cookies
        removeAuthCookies();

        // Reset Zustand state (preserve _hasHydrated)
        set({
          ...initialState,
          _hasHydrated: get()._hasHydrated,
        });
      },

      /**
       * Set hydration state
       * Internal use for tracking when store has rehydrated
       */
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      
      // Only persist essential auth data (exclude _hasHydrated)
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        tokenExpiresAt: state.tokenExpiresAt,
      }),

      // Handle rehydration to prevent Next.js hydration mismatches
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Auth store hydration error:', error);
          } else {
            console.log('Auth store hydrated successfully');
            // Mark hydration as complete
            state?.setHasHydrated(true);
          }
        };
      },
    }
  )
);

/**
 * Optimized Selectors
 * Prevent unnecessary re-renders by selecting specific slices
 */

export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);

export const useUser = () => useAuthStore((state) => state.user);

export const useToken = () => useAuthStore((state) => state.accessToken);

export const useRefreshToken = () =>
  useAuthStore((state) => state.refreshToken);

export const useTokenExpiresAt = () =>
  useAuthStore((state) => state.tokenExpiresAt);

/**
 * Hydration Guard Hook
 * Use this to prevent rendering auth-dependent content before hydration
 * 
 * @example
 * ```tsx
 * const hasHydrated = useHasHydrated();
 * if (!hasHydrated) return <Skeleton />;
 * ```
 */
export const useHasHydrated = () =>
  useAuthStore((state) => state._hasHydrated);

/**
 * Auth Actions Hook
 * Returns only the action methods (no state)
 */
export const useAuthActions = () =>
  useAuthStore((state) => ({
    setAuth: state.setAuth,
    updateUser: state.updateUser,
    clearAuth: state.clearAuth,
  }));
