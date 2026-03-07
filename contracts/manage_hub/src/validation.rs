use crate::errors::Error;

/// Maximum number of operations allowed in a single batch to prevent gas limits or DoS
pub const MAX_BATCH_SIZE: u32 = 50;

pub struct BatchValidator;

impl BatchValidator {
    /// Validates that the batch size is within acceptable limits.
    ///
    /// # Arguments
    /// * `size` - The number of items in the batch
    ///
    /// # Errors
    /// * `BatchSizeExceeded` - If size is 0 or greater than MAX_BATCH_SIZE
    pub fn validate_batch_size(size: u32) -> Result<(), Error> {
        if size == 0 || size > MAX_BATCH_SIZE {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }
}
