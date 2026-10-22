import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

async function validateChangePassword(newPassword: string) {
  return validate(
    plainToInstance(ChangePasswordDto, {
      currentPassword: 'current password',
      newPassword,
    }),
  );
}

describe('ChangePasswordDto password validation', () => {
  it('accepts a strong password within bcrypt limits', async () => {
    await expect(validateChangePassword('a suitably long new passphrase')).resolves.toHaveLength(0);
  });

  it('rejects passwords shorter than eight characters', async () => {
    const errors = await validateChangePassword('short');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('rejects passwords longer than bcrypt can use', async () => {
    const errors = await validateChangePassword('a'.repeat(73));
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('rejects common passwords', async () => {
    const errors = await validateChangePassword('Password123');
    expect(errors[0].constraints).toHaveProperty('isNotCommonPassword');
  });
});