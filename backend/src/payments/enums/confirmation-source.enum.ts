export enum ConfirmationSource {
  WEBHOOK = 'WEBHOOK',
  VERIFY_RETURN = 'VERIFY_RETURN',
  // Scheduled reconciliation resolved this independent of any webhook
  // (issue #1572) — see ReconciliationService.
  RECONCILIATION = 'RECONCILIATION',
}
