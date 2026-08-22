import { deriveEscrowId, escrowIdToHex } from './escrow-id';

describe('deriveEscrowId', () => {
  it('is deterministic for the same payment id', () => {
    const a = deriveEscrowId('11111111-1111-1111-1111-111111111111');
    const b = deriveEscrowId('11111111-1111-1111-1111-111111111111');

    expect(a.equals(b)).toBe(true);
  });

  it('differs for different payment ids', () => {
    const a = deriveEscrowId('11111111-1111-1111-1111-111111111111');
    const b = deriveEscrowId('22222222-2222-2222-2222-222222222222');

    expect(a.equals(b)).toBe(false);
  });

  it("produces exactly 32 bytes, matching the contract's BytesN<32> id", () => {
    expect(
      deriveEscrowId('11111111-1111-1111-1111-111111111111'),
    ).toHaveLength(32);
  });

  it('escrowIdToHex is a deterministic hex encoding of the same bytes', () => {
    const paymentId = '11111111-1111-1111-1111-111111111111';
    expect(escrowIdToHex(paymentId)).toBe(
      deriveEscrowId(paymentId).toString('hex'),
    );
    expect(escrowIdToHex(paymentId)).toHaveLength(64);
  });
});
