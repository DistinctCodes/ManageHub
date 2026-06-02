jest.mock('bcrypt');

import * as bcrypt from 'bcrypt';
import { isPasswordReused, addToHistory } from './password-history.service';

const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('isPasswordReused', () => {
  it('returns true when any hash matches', async () => {
    mockCompare
      .mockResolvedValueOnce(false as never)
      .mockResolvedValueOnce(true as never);
    const result = await isPasswordReused('password123', ['hash1', 'hash2']);
    expect(result).toBe(true);
  });

  it('returns false when no hash matches', async () => {
    mockCompare.mockResolvedValue(false as never);
    const result = await isPasswordReused('password123', ['hash1', 'hash2', 'hash3']);
    expect(result).toBe(false);
  });

  it('returns false for an empty history', async () => {
    const result = await isPasswordReused('password123', []);
    expect(result).toBe(false);
  });

  it('stops checking after first match (returns true for match at index 0)', async () => {
    mockCompare.mockResolvedValueOnce(true as never);
    const result = await isPasswordReused('password123', ['matchHash', 'other']);
    expect(result).toBe(true);
    expect(mockCompare).toHaveBeenCalledTimes(1);
  });
});

describe('addToHistory', () => {
  it('prepends new hash at index 0', () => {
    const result = addToHistory('newHash', ['old1', 'old2']);
    expect(result[0]).toBe('newHash');
  });

  it('default maxHistory is 5 — trims to 5 entries', () => {
    const history = ['h1', 'h2', 'h3', 'h4', 'h5'];
    const result = addToHistory('h0', history);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('h0');
  });

  it('never exceeds maxHistory entries', () => {
    const history = ['h1', 'h2', 'h3'];
    const result = addToHistory('h0', history, 3);
    expect(result).toHaveLength(3);
  });

  it('discards oldest (last) entries when exceeding maxHistory', () => {
    const result = addToHistory('new', ['a', 'b', 'c'], 3);
    expect(result).toEqual(['new', 'a', 'b']);
  });

  it('works with custom maxHistory', () => {
    const result = addToHistory('x', ['a', 'b', 'c', 'd', 'e', 'f'], 4);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('x');
  });
});
