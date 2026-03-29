// frontend/lib/react-query/keys/queryKeys.ts
// Add the invoiceKeys block below to your existing queryKeys object.
// If the file doesn't exist yet, use the full export below as a starting point.

export const queryKeys = {
  // ── existing keys (keep whatever is already here) ──────────────────────────

  // ── #42 Invoice keys ────────────────────────────────────────────────────────
  invoices: {
    /** Base key — used for invalidating all invoice queries at once */
    all: ["invoices"] as const,

    /**
     * Paginated list key.
     * @example queryKeys.invoices.list({ page: 1, limit: 10, status: "PAID" })
     */
    list: (params: { page?: number; limit?: number; status?: string }) =>
      ["invoices", "list", params] as const,

    /**
     * Single invoice key.
     * @example queryKeys.invoices.detail("abc-123")
     */
    detail: (id: string) => ["invoices", "detail", id] as const,
  },

  // ── Notification keys ──────────────────────────────────────────────────────
  notifications: {
    /** Base key — used for invalidating all notification queries at once */
    all: ["notifications"] as const,

    /**
     * Paginated list key.
     * @example queryKeys.notifications.list({ page: 1, limit: 10 })
     */
    list: (params: { page?: number; limit?: number }) =>
      ["notifications", "list", params] as const,
  },
};