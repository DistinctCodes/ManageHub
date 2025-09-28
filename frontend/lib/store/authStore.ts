import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { persist, devtools } from "zustand/middleware";
import {
  AuthResponse,
  AuthState,
  LoginUser,
  RegisterUser,
  User,
} from "../types/user";
import { apiClient } from "../apiClient";
import { storage } from "../storage";

interface AuthActions {
  // Authentication actions
  login: (data: LoginUser) => Promise<void>;
  register: (data: RegisterUser) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;

  //User actions
  updateProfile: (userData: Partial<User>) => Promise<void>;

  // State management actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // INITIAL STATE
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,

        // AUTHENTICATION ACTIONS
        login: async (data: LoginUser) => {
          try {
            set({ isLoading: true });

            const response = await apiClient.post<AuthResponse>(
              "/auth/login",
              data
            );

            const { user, accessToken } = response;

            // set the token in the api request headers authorization so that it always sends it to the backend when sending a request.
            apiClient.setToken(accessToken);

            // update the local ui store state
            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // persist token to local storage and cookie for middleware usage
            storage.setToken(accessToken);

            // persist user to local storage
            storage.setUser(user);
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },
        register: async (data: RegisterUser) => {
          try {
            set({ isLoading: true });

            const { user, accessToken } = await apiClient.post<AuthResponse>(
              "/auth/register",
              data
            );

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
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          apiClient.setToken(null);
          storage.clear();
        },
        refreshAccessToken: async () => {
          try {
            const currentToken = get().accessToken;

            if (!currentToken) {
              throw new Error("No token available");
            }

            const response = await apiClient.post<AuthResponse>(
              "/auth/refresh-token"
            );

            const { accessToken, user } = response;

            apiClient.setToken(accessToken);

            set({
              user,
              accessToken,
              isAuthenticated: true,
            });

            storage.setToken(accessToken);
            storage.setUser(user);
          } catch (error) {
            get().logout;
            throw error;
          }
        },

        // USER ACTIONS
        updateProfile: async (userData: Partial<User>) => {
          try {
            set({ isLoading: true });

            const user = await apiClient.patch<User>(
              "/users/profile",
              userData
            );

            set({
              user,
              isLoading: false,
            });

            storage.setUser(user);
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        // STATE MANAGEMENT ACTIONS
        setUser: (user: User | null) => {
          set({ user, isAuthenticated: !!user });
        },
        setToken: (accessToken: string | null) => {
          set({ accessToken });
          apiClient.setToken(accessToken);
        },
        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },
        initializeAuth: () => {
          // Get the persisted data from localstorage
          const accessToken = storage.getToken();
          const user = storage.getUser();

          if (accessToken && user) {
            apiClient.setToken(accessToken);

            set({
              user,
              accessToken,
              isAuthenticated: true,
            });
          }
        },
        clearAuth: () => {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          apiClient.setToken(null);
          storage.clear();
        },
      }),
      {
        name: "AuthStore",
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);

// SELECTORS FOR OPTIMIZED RE-RENDERS
export const useAuthState = () =>
  useAuthStore(
    useShallow((state) => ({
      user: state.user,
      accessToken: state.accessToken,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
    }))
  );

export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    register: state.register,
    logout: state.logout,
    refreshAccessToken: state.refreshAccessToken,
    updateProfile: state.updateProfile,
    initializeAuth: state.initializeAuth,
    clearAuth: state.clearAuth,
  }));
