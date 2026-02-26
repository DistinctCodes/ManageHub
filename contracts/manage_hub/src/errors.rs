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
    // Pause/Resume related errors
    InvalidPauseConfig = 23,
    SubscriptionPaused = 24,
    SubscriptionNotActive = 25,
    PauseCountExceeded = 26,
    PauseTooEarly = 27,
    SubscriptionNotPaused = 28,
    // Attendance analytics errors
    InvalidDateRange = 29,
    NoAttendanceRecords = 30,
    IncompleteSession = 31,
    // Tier and feature related errors
    TierNotFound = 32,
    FeatureNotAvailable = 33,
    // Tier change related errors
    TierChangeAlreadyProcessed = 34,
    InvalidDiscountPercent = 35,
    InvalidPromoDateRange = 36,
    PromotionAlreadyExists = 37,
    PromotionNotFound = 38,
    PromoCodeExpired = 39,
    PromoCodeMaxRedemptions = 40,
    PromoCodeInvalid = 41,
    // Tier management errors
    InvalidTierPrice = 42,
    TierAlreadyExists = 43,
    TierNotActive = 44,
    TierChangeNotFound = 45,
    // Token renewal errors (reusing codes where applicable)
    RenewalNotAllowed = 46,
    TransferNotAllowedInGracePeriod = 47,
    GracePeriodExpired = 48,
    AutoRenewalFailed = 49,
    // Token fractionalization errors
    TokenFractionalized = 50,
}
