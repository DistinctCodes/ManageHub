import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../apiClient';
import { storage } from '../storage';
import { User, RegisterUser, LoginUser, AuthResponse } from '../types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (data: LoginUser) => Promise<void>;
  register: (data: RegisterUser) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  clearAuth: () => void;
}

interface AuthStore extends AuthState, AuthActions {}

const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get): AuthStore => ({
        // Initial state
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,

        login: async (data: LoginUser) => {
          try {
            set({ isLoading: true });

            const response = await apiClient.post<AuthResponse>('/auth/login', data);
            
            const { user, accessToken } = response;

            apiClient.setToken(accessToken);
            
            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
            });

            storage.setToken(accessToken);
            storage.setUser(user);
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        register: async (data: RegisterUser) => {
          try {
            set({ isLoading: true });

            const response = await apiClient.post<AuthResponse>('/auth/register', data);
            
            const { user, accessToken } = response;

            apiClient.setToken(accessToken);
            
            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
            });

            storage.setToken(accessToken);
            storage.setUser(user);
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        logout: () => {
          apiClient.setToken(null);
          
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });

          storage.clear();
        },

        refreshAccessToken: async () => {
          try {
            set({ isLoading: true });

            const response = await apiClient.post<AuthResponse>('/auth/refresh');
            
            const { user, accessToken } = response;

            apiClient.setToken(accessToken);
            
            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
            });

            storage.setToken(accessToken);
            storage.setUser(user);
          } catch (error) {
            // If refresh fails, logout user
            get().logout();
            set({ isLoading: false });
            throw error;
          }
        },

        updateProfile: async (userData: Partial<User>) => {
          try {
            set({ isLoading: true });

            const updatedUser = await apiClient.patch<User>('/users/profile', userData);
            
            set({
              user: updatedUser,
              isLoading: false,
            });

            // Persist updated user to storage
            storage.setUser(updatedUser);
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        setUser: (user: User | null) => {
          set({ user, isAuthenticated: !!user });
        },

        setToken: (token: string | null) => {
          apiClient.setToken(token);
          set({ accessToken: token, isAuthenticated: !!token && !!get().user });
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        initializeAuth: () => {
          // Get persisted data from storage
          const persistedToken = storage.getToken();
          const persistedUser = storage.getUser() as User | null;

          if (persistedToken && persistedUser) {
            apiClient.setToken(persistedToken);
            
            set({
              user: persistedUser,
              accessToken: persistedToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            get().clearAuth();
          }
        },

        clearAuth: () => {
          apiClient.setToken(null);
          
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          storage.clear();
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state: AuthStore) => ({
          user: state.user,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          // Initialize auth on rehydration
          if (state?.accessToken && state?.user) {
            apiClient.setToken(state.accessToken);
            storage.setToken(state.accessToken);
            storage.setUser(state.user);
          }
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Selectors for optimized re-renders
export const useAuthState = () => 
  useAuthStore((state: AuthStore) => ({
    user: state.user,
    accessToken: state.accessToken,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  }));

export const useAuthActions = () =>
  useAuthStore((state: AuthStore) => ({
    login: state.login,
    register: state.register,
    logout: state.logout,
    refreshAccessToken: state.refreshAccessToken,
    updateProfile: state.updateProfile,
    setUser: state.setUser,
    setToken: state.setToken,
    setLoading: state.setLoading,
    initializeAuth: state.initializeAuth,
    clearAuth: state.clearAuth,
  }));

export default useAuthStore;