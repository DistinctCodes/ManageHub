// Edge-case scaffolding for the escrow contract (issue CT-52).
// Each case asserts the call is rejected, not silently accepted.
// Fill in with the actual Soroban test harness/client once available.

#[test]
fn double_release_is_rejected() {
    // release(escrow_id) twice -> second call must error, not no-op.
}

#[test]
fn refund_after_release_is_rejected() {
    // refund(escrow_id) after a successful release() must error.
}

#[test]
fn release_of_nonexistent_escrow_is_rejected() {
    // release() on an unknown escrow_id must error, not panic silently.
}

#[test]
fn refund_of_nonexistent_escrow_is_rejected() {
    // refund() on an unknown escrow_id must error.
}

#[test]
fn unauthorized_release_is_rejected() {
    // release() called by anyone other than the authorized party must error.
}

#[test]
fn unauthorized_refund_is_rejected() {
    // refund() called by anyone other than the authorized party must error.
}
