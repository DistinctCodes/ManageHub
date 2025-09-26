import { BcryptProvider } from '../bcrypt.provider';

describe('BcryptProvider', () => {
  it('hashes and compares correctly', async () => {
    const provider = new BcryptProvider();
    const hash = await provider.hash('secret');
    expect(typeof hash).toBe('string');
    await expect(provider.compare('secret', hash)).resolves.toBe(true);
    await expect(provider.compare('wrong', hash)).resolves.toBe(false);
  });
});