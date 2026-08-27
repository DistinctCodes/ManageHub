/**
 * Structured admin actions captured by the AdminActionLog. Kept here so the
 * audit trail has a stable, queryable vocabulary rather than ad hoc strings.
 */
export enum AdminActionType {
  SETTLEMENT_BATCH_EXECUTE = 'settlement_batch_execute',
  SETTLEMENT_BATCH_RETRY = 'settlement_batch_retry',
  SETTLEMENT_BATCH_ABANDON = 'settlement_batch_abandon',
  SPLIT_CONFIG_ACTIVATE = 'split_config_activate',
  SPLIT_CONFIG_DEACTIVATE = 'split_config_deactivate',
  PAYMENT_RESOLVE_MANUALLY = 'payment_resolve_manually',
  PAYMENT_VOID = 'payment_void',
}
