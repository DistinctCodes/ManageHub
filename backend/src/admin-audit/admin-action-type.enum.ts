/**
 * Structured admin actions captured by the AdminActionLog. Kept here so the
 * audit trail has a stable, queryable vocabulary rather than ad hoc strings.
 * Every new member must document the route that records it, the operator
 * action that causes it, and the meaning of its detail field.
 */
export enum AdminActionType {
  /**
   * Recorded by `POST /credits/admin/settlement/batches/:id/execute` when an
   * operator advances an existing batch by one step. The service submits
   * PENDING payouts, polls SUBMITTED payouts, and confirms only a rail
   * confirmation; `detail` is the batch mode (`DISTRIBUTION` or
   * `NET_PAYABLE`), while the target is the SettlementBatch id.
   */
  SETTLEMENT_BATCH_EXECUTE = 'settlement_batch_execute',

  /**
   * Recorded by `POST /credits/admin/settlement/batches/:id/retry` when an
   * operator re-queues that batch's FAILED payouts and advances the batch
   * again. Existing payout idempotency keys are reused, so a rail transfer
   * that already landed is not paid twice; `detail` is the batch mode and
   * the target is the SettlementBatch id.
   */
  SETTLEMENT_BATCH_RETRY = 'settlement_batch_retry',

  /**
   * Recorded by `POST /credits/admin/settlement/batches/:id/abandon` when an
   * operator gives up on a batch. The service fails its non-terminal
   * payouts and releases unsettled claims without posting a drawdown;
   * `detail` is the required operator reason and the target is the
   * SettlementBatch id.
   */
  SETTLEMENT_BATCH_ABANDON = 'settlement_batch_abandon',

  /**
   * Recorded by `POST /credits/admin/splits/:id/active` when the submitted
   * `active` flag enables a revenue split configuration. The target is the
   * RevenueSplitConfig id and `detail` is the configuration name.
   */
  SPLIT_CONFIG_ACTIVATE = 'split_config_activate',

  /**
   * Recorded by `POST /credits/admin/splits/:id/active` when the submitted
   * `active` flag disables a revenue split configuration. The target is the
   * RevenueSplitConfig id and `detail` is the configuration name.
   */
  SPLIT_CONFIG_DEACTIVATE = 'split_config_deactivate',

  /**
   * Recorded by `POST /payments/admin/:id/resolve-manually` when an operator
   * resolves a MANUAL_REVIEW payment to CONFIRMED or FAILED using the
   * supplied reason. The target is the Payment id and `detail` is
   * `Resolution: <resolution> - <reason>`.
   */
  PAYMENT_RESOLVE_MANUALLY = 'payment_resolve_manually',

  /**
   * Recorded by `POST /payments/admin/:id/void` when an operator voids a
   * MANUAL_REVIEW payment without choosing CONFIRMED or FAILED. The target
   * is the Payment id and `detail` is the required operator reason.
   */
  PAYMENT_VOID = 'payment_void',
}
