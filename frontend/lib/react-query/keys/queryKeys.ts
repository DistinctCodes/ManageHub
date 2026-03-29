export const queryKeys = {
  bookings: {
    all: ["bookings"] as const,
    mine: (params: { page?: number; limit?: number }) =>
      ["bookings", "mine", params] as const,
    priceEstimate: (params: Record<string, unknown>) =>
      ["bookings", "price-estimate", params] as const,
  },

  workspaceTracking: {
    active: ["workspace-tracking", "active"] as const,
  },

  workspaces: {
    all: ["workspaces"] as const,
    list: (params: {
      search?: string;
      type?: string;
      page?: number;
      limit?: number;
    }) => ["workspaces", "list", params] as const,
  },

  admin: {
    workspaces: {
      all: ["admin", "workspaces"] as const,
      list: (params: { page?: number; limit?: number; search?: string }) =>
        ["admin", "workspaces", "list", params] as const,
    },
  },

  notifications: {
    all: ["notifications"] as const,
    list: (params: { page?: number; limit?: number }) =>
      ["notifications", "list", params] as const,
  },

  invoices: {
    all: ["invoices"] as const,
    list: (params: { page?: number; limit?: number; status?: string }) =>
      ["invoices", "list", params] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
  },
} as const;
