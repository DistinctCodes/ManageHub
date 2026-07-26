# Unified Error Codes

This document audits and documents all error codes across the ManageHub smart contract
monorepo. Error codes are assigned non-colliding ranges per contract to avoid
ambiguity when errors propagate across contract boundaries.

## Range Allocation

| Contract | Range | Prefix |
|----------|-------|--------|
| manage_hub | 1000–1999 | MH- |
| access_control | 2000–2999 | AC- |
| membership_token | 3000–3999 | MT- |
| workspace_booking | 4000–4999 | WB- |
| payment_escrow | 5000–5999 | PE- |
| resource_credits | 6000–6999 | RC- |

---

## manage_hub (1000–1999)

| Code | Name | Description |
|------|------|-------------|
| 1000 | AdminNotSet | No admin has been configured |
| 1001 | TokenAlreadyIssued | Token with this ID already exists |
| 1002 | TokenNotFound | Token with this ID not found |
| 1003 | Unauthorized | Caller is not authorized |
| 1004 | TokenExpired | Token has expired |
| 1005 | InvalidExpiryDate | Expiry date must be in the future |
| 1006 | InvalidEventDetails | Event details validation failed |
| 1007 | InvalidPaymentAmount | Payment amount is invalid |
| 1008 | InvalidPaymentToken | Payment token address is invalid |
| 1009 | SubscriptionNotFound | Subscription not found |
| 1010 | UsdcContractNotSet | USDC contract address not configured |
| 1011 | AttendanceLogFailed | Attendance log operation failed |
| 1012 | SubscriptionAlreadyExists | Subscription with this ID already exists |
| 1013 | InsufficientBalance | Insufficient balance for operation |
| 1014 | TimestampOverflow | Timestamp arithmetic overflow |
| 1015 | MetadataNotFound | Token metadata not found |
| 1016 | MetadataDescriptionTooLong | Metadata description exceeds max length |
| 1017 | MetadataTooManyAttributes | Metadata attributes count exceeds limit |
| 1018 | MetadataAttributeKeyTooLong | Metadata attribute key exceeds max length |
| 1019 | MetadataTextValueTooLong | Metadata text value exceeds max length |
| 1020 | MetadataValidationFailed | Metadata validation failed |
| 1021 | InvalidMetadataVersion | Invalid metadata version |
| 1022 | InvalidPauseConfig | Pause configuration is invalid |
| 1023 | SubscriptionPaused | Subscription is currently paused |
| 1024 | SubscriptionNotActive | Subscription is not active |
| 1025 | PauseCountExceeded | Maximum pause count exceeded |
| 1026 | PauseTooEarly | Cannot pause yet (min active time not met) |
| 1027 | SubscriptionNotPaused | Subscription is not paused |
| 1028 | InvalidDateRange | Start time is after end time |
| 1029 | NoAttendanceRecords | No attendance records found |
| 1030 | IncompleteSession | Attendance session is incomplete |
| 1031 | TierNotFound | Subscription tier not found |
| 1032 | FeatureNotAvailable | Feature not available for this tier |
| 1033 | TierChangeAlreadyProcessed | Tier change already processed |
| 1034 | InvalidDiscountPercent | Discount percent is invalid |
| 1035 | InvalidPromoDateRange | Promotion date range is invalid |
| 1036 | PromotionAlreadyExists | Promotion already exists |
| 1037 | PromotionNotFound | Promotion not found |
| 1038 | PromoCodeExpired | Promo code has expired |
| 1039 | PromoCodeMaxRedemptions | Promo code max redemptions reached |
| 1040 | PromoCodeInvalid | Promo code is invalid |
| 1041 | InvalidTierPrice | Tier price is invalid |
| 1042 | TierAlreadyExists | Tier with this ID already exists |
| 1043 | TierNotActive | Tier is not active |
| 1044 | TierChangeNotFound | Tier change request not found |
| 1045 | RenewalNotAllowed | Renewals are disabled |
| 1046 | TransferNotAllowedInGracePeriod | Transfer not allowed during grace period |
| 1047 | GracePeriodExpired | Grace period has expired |
| 1048 | AutoRenewalFailed | Auto-renewal processing failed |
| 1049 | TokenFractionalized | Token is fractionalized |

---

## access_control (2000–2999)

| Code | Name | Description |
|------|------|-------------|
| 2000 | Unauthorized | Caller is not authorized |
| 2001 | AdminRequired | Admin privileges required |
| 2002 | InvalidRole | Invalid role specified |
| 2003 | InsufficientRole | User does not have required role |
| 2004 | RoleAssignmentFailed | Role assignment failed |
| 2005 | MembershipTokenNotSet | Membership token contract not configured |
| 2006 | MembershipTokenCallFailed | Cross-contract call failed |
| 2007 | InsufficientMembership | Insufficient membership token balance |
| 2008 | InvalidTokenBalance | Invalid membership token balance |
| 2009 | NotInitialized | Access control not initialized |
| 2010 | ConfigurationError | Configuration error |
| 2011 | StorageError | Storage operation failed |
| 2012 | InvalidAddress | Invalid address provided |
| 2013 | RoleHierarchyViolation | Role hierarchy violation |
| 2014 | MaxRolesExceeded | Maximum roles per user exceeded |
| 2015 | ContractPaused | Contract is paused |
| 2016 | MultisigNotEnabled | Multisig not enabled |
| 2017 | InsufficientApprovals | Insufficient approvals |
| 2018 | ProposalNotFound | Proposal not found |
| 2019 | ProposalAlreadyExecuted | Proposal already executed |
| 2020 | ProposalExpired | Proposal has expired |
| 2021 | TimeLockActive | Time-lock not yet passed |
| 2022 | AlreadyApproved | Already approved this proposal |
| 2023 | AlreadyRejected | Already rejected this proposal |
| 2024 | CannotExecuteProposal | Cannot execute proposal yet |
| 2025 | MaxProposalsReached | Maximum pending proposals reached |
| 2026 | InvalidProposalType | Invalid proposal type |
| 2027 | InvalidMultisigConfig | Invalid multisig configuration |
| 2028 | ThresholdTooHigh | Threshold too high |
| 2029 | ThresholdTooLow | Threshold too low |
| 2030 | CannotRemoveLastAdmin | Cannot remove last admin |
| 2031 | DuplicateAdmin | Duplicate admin address |
| 2032 | NotMultisigAdmin | Not a multisig admin |
| 2033 | ProposalRejected | Proposal rejected |

---

## membership_token (3000–3999)

| Code | Name | Description |
|------|------|-------------|
| 3000 | AdminNotSet | No admin configured |
| 3001 | TokenAlreadyIssued | Token already exists |
| 3002 | InvalidExpiryDate | Invalid expiry date |
| 3003 | TokenNotFound | Token not found |
| 3004 | TokenExpired | Token has expired |

---

## workspace_booking (4000–4999)

| Code | Name | Description |
|------|------|-------------|
| 4000 | AdminNotSet | No admin configured |
| 4001 | Unauthorized | Caller not authorized |
| 4002 | AlreadyInitialized | Contract already initialized |
| 4003 | PaymentTokenNotSet | Payment token not configured |
| 4004 | StringTooLong | String exceeds allowed length |
| 4005 | InvalidCapacity | Capacity must be >= 1 |
| 4006 | InvalidRate | Hourly rate must be > 0 |
| 4007 | InvalidTimeRange | Invalid booking time window |
| 4008 | BookingNotFound | Booking not found |
| 4009 | BookingAlreadyExists | Booking already exists |
| 4010 | BookingConflict | Booking overlaps with another |
| 4011 | BookingNotActive | Booking must be active |
| 4012 | BookingExpired | Booking has expired |
| 4013 | BookingAlreadyCancelled | Booking already cancelled |
| 4014 | BookingAlreadyCompleted | Booking already completed |
| 4015 | InsufficientBalance | Insufficient balance |
| 4016 | WorkspaceNotFound | Workspace not found |
| 4017 | WorkspaceAlreadyExists | Workspace already exists |
| 4018 | WorkspaceUnavailable | Workspace unavailable |
| 4019 | WorkspaceHasActiveBookings | Cannot modify with active bookings |

---

## payment_escrow (5000–5999)

| Code | Name | Description |
|------|------|-------------|
| 5000 | AdminNotSet | No admin configured |
| 5001 | Unauthorized | Caller not authorized |
| 5002 | AlreadyInitialized | Contract already initialized |
| 5003 | EscrowNotFound | Escrow not found |
| 5004 | EscrowAlreadyExists | Escrow already exists |
| 5005 | EscrowNotPending | Escrow not in Pending status |
| 5006 | EscrowNotDisputed | Escrow not in Disputed status |
| 5007 | DisputeWindowClosed | Dispute window has closed |
| 5008 | ClaimTooEarly | release_after not reached |
| 5009 | AutoClaimDisabled | Auto-claim disabled |
| 5010 | InvalidAmount | Amount must be > 0 |
| 5011 | PaymentTokenNotSet | Payment token not configured |

---

## resource_credits (6000–6999)

| Code | Name | Description |
|------|------|-------------|
| 6000 | AdminNotSet | No admin configured |
| 6001 | AlreadyInitialized | Contract already initialized |
| 6002 | Unauthorized | Caller not the admin |
| 6003 | InsufficientBalance | Insufficient credit balance |
| 6004 | InvalidAmount | Amount must be > 0 |
| 6005 | AccountNotFound | Account not found |

---

## Collision Analysis

### Previous Collision (RESOLVED)

The following error names were shared across contracts with different numeric codes:

| Name | manage_hub | access_control | membership_token | workspace_booking | payment_escrow | resource_credits |
|------|-----------|---------------|-----------------|-------------------|---------------|-----------------|
| AdminNotSet | 1 | 101 (as AdminRequired) | 1 | 1 | 1 | 1 |
| Unauthorized | 4 | 100 | — | 2 | 2 | 3 |
| AlreadyInitialized | — | 110 (as ConfigurationError) | — | 3 | 3 | 2 |
| InsufficientBalance | 14 | — | — | 107 | — | 4 |

**After unification**: Each contract now uses its own range, eliminating all collisions.
When an error is caught cross-contract, the range prefix immediately identifies
the originating contract.
