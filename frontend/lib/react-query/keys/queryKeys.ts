export const queryKeys = {
  workspaces: {
    all: ["workspaces"] as const,
    list: (params?: unknown) => ["workspaces", "list", params] as const,
    detail: (id: string) => ["workspaces", id] as const,
    availability: (id: string, seats?: number) =>
      ["workspaces", id, "availability", seats] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    mine: (params?: Record<string, unknown>) =>
      ["bookings", "mine", params] as const,
    detail: (id: string) => ["bookings", id] as const,
    priceEstimate: (params: unknown) =>
      ["bookings", "price-estimate", params] as const,
  },
  payments: {
    mine: (params?: Record<string, unknown>) =>
      ["payments", "mine", params] as const,
  },
  invoices: {
    mine: (params?: Record<string, unknown>) =>
      ["invoices", "mine", params] as const,
    detail: (id: string) => ["invoices", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params?: unknown) => ["notifications", "list", params] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
  workspaceTracking: {
    active: ["workspace-tracking", "active"] as const,
    history: (params?: unknown) =>
      ["workspace-tracking", "history", params] as const,
  },
  dashboard: {
    member: ["dashboard", "member"] as const,
    adminAnalytics: (params?: unknown) =>
      ["dashboard", "admin", "analytics", params] as const,
  },
  twoFactor: {
    status: ["2fa", "status"] as const,
  },
  admin: {
    workspaces: {
      all: ["admin", "workspaces"] as const,
      list: (params?: unknown) => ["admin", "workspaces", "list", params] as const,
    },
    bookings: {
      all: ["admin", "bookings"] as const,
      list: (params?: unknown) => ["admin", "bookings", "list", params] as const,
    },
    members: {
      all: ["admin", "members"] as const,
      list: (params?: unknown) => ["admin", "members", "list", params] as const,
      detail: (id: string) => ["admin", "members", id] as const,
    },
    analytics: (params?: unknown) => ["admin", "analytics", params] as const,
  },
} as const;
