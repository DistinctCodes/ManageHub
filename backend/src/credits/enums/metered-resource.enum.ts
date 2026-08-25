/**
 * The metered resources that charge through the credit ledger instead of
 * settling on-chain per event (issue #1575). Priced in minor units per
 * unit by the caller — the ledger only ever sees the resulting amount.
 */
export enum MeteredResource {
  /** Per-minute usage of a bookable resource (desk, booth, equipment). */
  RESOURCE_MINUTES = 'RESOURCE_MINUTES',
  /** Per-page printing. */
  PRINTING = 'PRINTING',
  /** Minutes used beyond a meeting-room booking's window. */
  MEETING_ROOM_OVERAGE = 'MEETING_ROOM_OVERAGE',
}
