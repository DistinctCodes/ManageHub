// Issue #797 - Tests for the revenue_distribution contract

import { setBeneficiaries, depositRevenue, getBeneficiaries } from "./beneficiaryManager";
import { createDistribution, claim } from "./distribution";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function assertThrows(fn: () => void, expectedMsg: string) {
  try {
    fn();
    throw new Error(`FAIL: expected error "${expectedMsg}" but none thrown`);
  } catch (e: any) {
    assert(e.message.includes(expectedMsg), `throws "${expectedMsg}"`);
  }
}

// Test: invalid shares rejected
assertThrows(
  () => setBeneficiaries("admin", [{ address: "alice", share_bps: 5000 }]),
  "InvalidShares"
);

// Test: valid beneficiaries accepted
setBeneficiaries("admin", [
  { address: "alice", share_bps: 6000 },
  { address: "bob", share_bps: 4000 },
]);
assert(getBeneficiaries().length === 2, "beneficiaries set");

// Test: non-admin rejected
assertThrows(() => setBeneficiaries("hacker", []), "Unauthorized");

// Test: deposit increases balance
depositRevenue("alice", 1000);

// Test: invalid deposit rejected
assertThrows(() => depositRevenue("alice", 0), "InvalidAmount");

// Test: distribution created
createDistribution("admin", "dist-1");

// Test: non-admin cannot create distribution
assertThrows(() => createDistribution("hacker", "dist-2"), "Unauthorized");

// Test: claim transfers correct amount
const amount = claim("alice", "dist-1");
assert(amount === 600, `alice gets 600, got ${amount}`);

// Test: double-claim rejected
assertThrows(() => claim("alice", "dist-1"), "AlreadyClaimed");

console.log("\nAll tests passed.");
