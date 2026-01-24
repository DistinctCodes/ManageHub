use membership_token::Error as MembershipTokenError;
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
    SubscriptionPaused = 16,
    SubscriptionNotActive = 17,
    SubscriptionNotPaused = 18,
    PauseTooEarly = 19,
    PauseCountExceeded = 20,
    PauseDurationExceeded = 21,
    InvalidPauseConfig = 22,
}

impl From<MembershipTokenError> for Error {
    fn from(e: MembershipTokenError) -> Self {
        match e {
            MembershipTokenError::AdminNotSet => Error::AdminNotSet,
            MembershipTokenError::TokenAlreadyIssued => Error::TokenAlreadyIssued,
            MembershipTokenError::InvalidExpiryDate => Error::InvalidExpiryDate,
            MembershipTokenError::TokenNotFound => Error::TokenNotFound,
            MembershipTokenError::TokenExpired => Error::TokenExpired,
        }
    }
}
