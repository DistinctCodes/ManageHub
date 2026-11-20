/** Error codes returned by the payment_escrow contract. */
export enum PaymentEscrowError {
  NotFound = 1,
  AlreadyResolved = 2,
  InvalidAmount = 3,
  AlreadyExists = 4,
  ArithmeticOverflow = 5,
  AlreadyReleased = 6,
  AlreadyRefunded = 7,
  AlreadyInitialized = 10,
  NotInitialized = 11,
  Unauthorized = 12,
  Paused = 13,
  NoPendingAdmin = 14,
  AmountExceedsEscrow = 20,
  NothingToRefund = 21,
  TokenNotAllowed = 22,
  TransferShortfall = 23,
}

/** Error codes returned by the revenue_distribution contract. */
export enum RevenueDistributionError {
  InvalidBasisPoints = 1,
  NotConfigured = 2,
  Unauthorized = 3,
  EmptyRecipients = 4,
  ArithmeticOverflow = 5,
  InvalidShare = 6,
  InvalidAmount = 7,
  TokenNotAllowed = 8,
  TooManyBeneficiaries = 9,
  AlreadyInitialized = 10,
  NotInitialized = 11,
  NoPendingAdmin = 12,
  DuplicateBeneficiary = 13,
}
