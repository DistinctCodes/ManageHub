export const mutationKeys = {
  auth: {
    registerUser: ["auth", "register"] as const,
    loginUser: ["auth", "login"] as const,
    forgotPassword: ["auth", "forgot-password"] as const,
    logoutUser: ["auth", "logout"] as const,
    refreshToken: ["auth", "refresh"] as const,
  },
} as const;

export type MutationKeys = typeof mutationKeys;

export const getAuthMutationKeys = () => Object.values(mutationKeys.auth);
