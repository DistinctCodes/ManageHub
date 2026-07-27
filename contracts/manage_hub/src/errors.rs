use soroban_sdk::contracterror;

/// ManageHub contract errors.
///
/// Error code range: 1000–1999
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AdminNotSet = 1000,
    TokenAlreadyIssued = 1001,
    TokenNotFound = 1002,
    Unauthorized = 1003,
    TokenExpired = 1004,
    InvalidExpiryDate = 1005,
    InvalidEventDetails = 1006,
    InvalidPaymentAmount = 1007,
    InvalidPaymentToken = 1008,
    SubscriptionNotFound = 1009,
    UsdcContractNotSet = 1010,
    AttendanceLogFailed = 1011,
    SubscriptionAlreadyExists = 1012,
    InsufficientBalance = 1013,
    TimestampOverflow = 1014,
    MetadataNotFound = 1015,
    MetadataDescriptionTooLong = 1016,
    MetadataTooManyAttributes = 1017,
    MetadataAttributeKeyTooLong = 1018,
    MetadataTextValueTooLong = 1019,
    MetadataValidationFailed = 1020,
    InvalidMetadataVersion = 1021,
    // Pause/Resume related errors
    InvalidPauseConfig = 1022,
    SubscriptionPaused = 1023,
    SubscriptionNotActive = 1024,
    PauseCountExceeded = 1025,
    PauseTooEarly = 1026,
    SubscriptionNotPaused = 1027,
    // Attendance analytics errors
    InvalidDateRange = 1028,
    NoAttendanceRecords = 1029,
    IncompleteSession = 1030,
    // Tier and feature related errors
    TierNotFound = 1031,
    FeatureNotAvailable = 1032,
    // Tier change related errors
    TierChangeAlreadyProcessed = 1033,
    PromotionNotFound = 1037,
    PromoCodeMaxRedemptions = 1039,
    PromoCodeInvalid = 1040,
    // Tier management errors
    InvalidTierPrice = 1041,
    TierAlreadyExists = 1042,
    TierNotActive = 1043,
    TierChangeNotFound = 1044,
    // Token renewal errors
    RenewalNotAllowed = 1045,
    TransferNotAllowedInGracePeriod = 1046,
    GracePeriodExpired = 1047,
    AutoRenewalFailed = 1048,
    // Token fractionalization errors
    TokenFractionalized = 1049,
    // Contract paused (global)
    ContractPaused = 1050,
    // Admin transfer errors
    AdminTransferAlreadyPending = 1051,
    AdminTransferNotFound = 1052,
    AdminTransferExpired = 1053,
}
