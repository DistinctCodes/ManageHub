jest.mock('bcrypt');

import * as bcrypt from 'bcrypt';
import { generateRecoveryCodes, hashRecoveryCodes, verifyRecoveryCode } from './recovery-codes.service';

const mockHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('generateRecoveryCodes', () => {
  it('produces exactly 8 codes by default', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
  });

  it('produces exactly count codes when specified', () => {
    expect(generateRecoveryCodes(3)).toHaveLength(3);
    expect(generateRecoveryCodes(12)).toHaveLength(12);
  });

  it('each code is exactly 10 characters', () => {
    const codes = generateRecoveryCodes(8);
    for (const code of codes) {
      expect(code).toHaveLength(10);
    }
  });

  it('each code contains only uppercase alphanumeric characters', () => {
    const codes = generateRecoveryCodes(20);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{10}$/);
    }
  });
});

describe('hashRecoveryCodes', () => {
  it('returns the same number of hashes as input codes', async () => {
    mockHash.mockResolvedValue('hashed' as never);
    const hashes = await hashRecoveryCodes(['CODE1', 'CODE2', 'CODE3']);
    expect(hashes).toHaveLength(3);
  });
});

describe('verifyRecoveryCode', () => {
  it('returns { matched: false, index: -1 } when no code matches', async () => {
    mockCompare.mockResolvedValue(false as never);
    const result = await verifyRecoveryCode('WRONG', ['hash1', 'hash2']);
    expect(result).toEqual({ matched: false, index: -1 });
  });

  it('returns { matched: true, index } for matching code', async () => {
    mockCompare
      .mockResolvedValueOnce(false as never)
      .mockResolvedValueOnce(true as never);
    const result = await verifyRecoveryCode('RIGHTCODE', ['hash1', 'hash2']);
    expect(result).toEqual({ matched: true, index: 1 });
  });

  it('returns { matched: false, index: -1 } for empty hashedCodes array', async () => {
    const result = await verifyRecoveryCode('CODE', []);
    expect(result).toEqual({ matched: false, index: -1 });
  });
});
