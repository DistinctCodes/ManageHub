export const queryKeys = {
  // ... existing keys ...

  adminAnalytics: (from?: string, to?: string) =>
    ["adminAnalytics", { from, to }] as const,

  memberDashboard: () => ["memberDashboard"] as const,
};
