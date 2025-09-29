use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AdminNotSet = 1,
    TokenAlreadyIssued = 2,
    TokenNotFound = 3,
    Unauthorized = 4,
    TokenExpired = 5,
    InvalidExpiryDate = 6,
    InvalidPaymentAmount = 7,
    InvalidPaymentToken = 8,
    InsufficientBalance = 9,
    InsufficientAllowance = 10,
    UsdcContractNotSet = 11,
    SubscriptionNotFound = 12,
    PaymentValidationFailed = 13,
}
