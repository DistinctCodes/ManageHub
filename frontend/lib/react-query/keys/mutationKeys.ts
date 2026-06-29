export const mutationKeys = {
  auth: {
    registerUser: ["auth", "register"] as const,
    loginUser: ["auth", "login"] as const,
    forgotPassword: ["auth", "forgot-password"] as const,
    logoutUser: ["auth", "logout"] as const,
    refreshToken: ["auth", "refresh"] as const,
  },
  nps: {
    respond: ["nps", "respond"] as const,
  },
  branding: {
    update: ["branding", "update"] as const,
    uploadLogo: ["branding", "upload-logo"] as const,
    uploadFavicon: ["branding", "upload-favicon"] as const,
  },
} as const;

export type MutationKeys = typeof mutationKeys;

export const getAuthMutationKeys = () => Object.values(mutationKeys.auth);
