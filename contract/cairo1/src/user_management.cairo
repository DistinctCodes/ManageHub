%lang starknet

// Simple Cairo 1 StarkNet contract implementing user management per spec.
// Note: adjust imports/syscall names if your toolchain requires different modules.

from starknet.common.syscalls import get_caller_address
from starknet.common.storage import Storage
from starknet.common.cairo_builtins import HashBuiltin

// Role constants
const ROLE_USER : felt = 0;
const ROLE_STAFF : felt = 1;
const ROLE_ADMIN : felt = 2;
const ROLE_OWNER : felt = 3;

// Threshold for failed attempts that triggers a security alert
const FAILED_ATTEMPT_THRESHOLD : felt = 3;

// -- Storage variables --
// owner address
@storage_var
func owner() -> (res: felt):
end

// Per-user maps (keyed by user address - felt)
@storage_var
func user_name(key: felt) -> (res: felt):
end

@storage_var
func user_role(key: felt) -> (res: felt):
end

@storage_var
func user_active(key: felt) -> (res: felt):
end

@storage_var
func user_registered_at(key: felt) -> (res: felt):
end

@storage_var
func user_last_activity(key: felt) -> (res: felt):
end

@storage_var
func user_department(key: felt) -> (res: felt):
end

@storage_var
func user_employee_id(key: felt) -> (res: felt):
end

@storage_var
func biometric_hash(key: felt) -> (res: felt):
end

@storage_var
func failed_attempts(key: felt) -> (res: felt):
end

@storage_var
func session_active(key: felt) -> (res: felt):
end

// --- Events ---
@event
func UserRegistered(user_address: felt, name: felt, role: felt, timestamp: felt):
end

@event
func BiometricUpdated(user_address: felt, timestamp: felt):
end

@event
func UserDeactivated(user_address: felt, timestamp: felt):
end

@event
func LoginAttempt(user_address: felt, success: felt, timestamp: felt):
end

@event
func SecurityAlert(user_address: felt, alert_type: felt, timestamp: felt):
end

// --- Constructor ---
@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    new_owner: felt
) {
    owner.write(new_owner);
    return ();
}

// --- Internal helpers ---
func _only_admin{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() {
    let (caller) = get_caller_address();
    let (stored_owner) = owner.read();
    // owner always allowed
    if caller == stored_owner {
        return ();
    }
    let (r) = user_role.read(caller);
    // allow admin or owner roles
    assert r == ROLE_ADMIN or r == ROLE_OWNER;
    return ();
}

func _is_admin{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user: felt
) -> (res: felt) {
    let (stored_owner) = owner.read();
    if user == stored_owner {
        return (res=1);
    }
    let (r) = user_role.read(user);
    if r == ROLE_ADMIN or r == ROLE_OWNER {
        return (res=1);
    }
    return (res=0);
}

// --- Public functions ---

// register_user: Admin only
@external
func register_user{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user_address: felt,
    name: felt,
    role: felt,
    biometric: felt,
    department: felt,
    employee_id: felt,
    timestamp: felt
) {
    // admin check
    _only_admin();

    user_name.write(user_address, name);
    user_role.write(user_address, role);
    user_active.write(user_address, 1);
    user_registered_at.write(user_address, timestamp);
    user_last_activity.write(user_address, timestamp);
    user_department.write(user_address, department);
    user_employee_id.write(user_address, employee_id);
    biometric_hash.write(user_address, biometric);
    failed_attempts.write(user_address, 0);
    session_active.write(user_address, 0);

    UserRegistered.emit(user_address=user_address, name=name, role=role, timestamp=timestamp);
    return ();
}

// update_biometric: Owner or self
@external
func update_biometric{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user_address: felt, new_biometric: felt, timestamp: felt
) {
    let (caller) = get_caller_address();
    let (stored_owner) = owner.read();
    if caller != stored_owner {
        // allow self update only
        assert caller == user_address;
    }
    biometric_hash.write(user_address, new_biometric);
    BiometricUpdated.emit(user_address=user_address, timestamp=timestamp);
    return ();
}

// verify_biometric: checks biometric and updates attempts/sessions; returns 1 (true) or 0 (false)
@view
func verify_biometric{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user_address: felt, biometric_to_check: felt, timestamp: felt
) -> (matched: felt) {
    let (stored) = biometric_hash.read(user_address);
    if stored == biometric_to_check {
        // success: reset failed attempts, update last activity & session active
        failed_attempts.write(user_address, 0);
        user_last_activity.write(user_address, timestamp);
        session_active.write(user_address, 1);
        LoginAttempt.emit(user_address=user_address, success=1, timestamp=timestamp);
        return (matched=1);
    } else {
        // failure: increment failed attempts, emit login attempt (failure), maybe security alert
        let (cur) = failed_attempts.read(user_address);
        let new = cur + 1;
        failed_attempts.write(user_address, new);
        LoginAttempt.emit(user_address=user_address, success=0, timestamp=timestamp);

        if new >= FAILED_ATTEMPT_THRESHOLD {
            // alert_type 1 = multiple failed attempts
            SecurityAlert.emit(user_address=user_address, alert_type=1, timestamp=timestamp);
        }
        return (matched=0);
    }
}

// get_user_role
@view
func get_user_role{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user_address: felt
) -> (role: felt) {
    let (r) = user_role.read(user_address);
    return (role=r);
}

// is_user_active
@view
func is_user_active{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user_address: felt
) -> (active: felt) {
    let (a) = user_active.read(user_address);
    return (active=a);
}

// deactivate_user: Admin only
@external
func deactivate_user{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user_address: felt, timestamp: felt
) {
    _only_admin();
    user_active.write(user_address, 0);
    UserDeactivated.emit(user_address=user_address, timestamp=timestamp);
    return ();
}