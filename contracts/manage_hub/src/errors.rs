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
    InvalidEventDetails = 7,
    InvalidPaymentAmount = 8,
    InvalidPaymentToken = 9,
    SubscriptionNotFound = 10,
    UsdcContractNotSet = 11,
    AttendanceLogFailed = 12,
    SubscriptionAlreadyExists = 13,
    InsufficientBalance = 14,
    TimestampOverflow = 15,
    MetadataNotFound = 16,
    MetadataDescriptionTooLong = 17,
    MetadataTooManyAttributes = 18,
    MetadataAttributeKeyTooLong = 19,
    MetadataTextValueTooLong = 20,
    MetadataValidationFailed = 21,
    InvalidMetadataVersion = 22,
}
