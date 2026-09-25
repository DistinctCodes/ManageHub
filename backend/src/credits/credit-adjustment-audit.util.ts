// Builds an admin-audit entry payload for bulk credit adjustments so every
// admin-initiated balance change is traceable, per credits-admin.controller.ts.
export interface CreditAdjustmentAuditEntry {
  action: 'BULK_CREDIT_ADJUSTMENT';
  adminId: string;
  userId: string;
  previousBalance: number;
  newBalance: number;
  delta: number;
  reason?: string;
  createdAt: Date;
}

export function buildCreditAdjustmentAuditEntry(params: {
  adminId: string;
  userId: string;
  previousBalance: number;
  newBalance: number;
  reason?: string;
}): CreditAdjustmentAuditEntry {
  return {
    action: 'BULK_CREDIT_ADJUSTMENT',
    adminId: params.adminId,
    userId: params.userId,
    previousBalance: params.previousBalance,
    newBalance: params.newBalance,
    delta: params.newBalance - params.previousBalance,
    reason: params.reason,
    createdAt: new Date(),
  };
}
