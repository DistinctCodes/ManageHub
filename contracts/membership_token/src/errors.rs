use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AdminNotSet = 1,
    TokenAlreadyIssued = 2,
    TokenNotFound = 3,
    Unauthorized = 4,
    TokenExpired = 5,
    InvalidExpiryDate = 6,
    InvalidPaymentAmount = 8,
    MetadataNotFound = 16,
    MetadataDescriptionTooLong = 17,
    MetadataTooManyAttributes = 18,
    MetadataAttributeKeyTooLong = 19,
    MetadataTextValueTooLong = 20,
    MetadataValidationFailed = 21,
    RenewalNotAllowed = 46,
    TransferNotAllowedInGracePeriod = 47,
    GracePeriodExpired = 48,
    AutoRenewalFailed = 49,
    TokenFractionalized = 50,
    TimestampOverflow = 15,
}
