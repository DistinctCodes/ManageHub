import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validateRegister(body: Record<string, unknown>) {
  const dto = plainToInstance(RegisterDto, body);
  return validate(dto);
}

describe('RegisterDto password policy (issue #1954)', () => {
  it('accepts a reasonable password', async () => {
    const errors = await validateRegister({
      email: 'user@example.com',
      password: 'correct horse battery staple',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const errors = await validateRegister({
      email: 'user@example.com',
      password: 'short1',
    });
    expect(errors.map((e) => e.constraints)).toContainEqual(
      expect.objectContaining({
        minLength: expect.stringMatching(/longer than or equal to 8/i),
      }),
    );
  });

  it('rejects passwords longer than bcrypt can use (72 bytes)', async () => {
    const errors = await validateRegister({
      email: 'user@example.com',
      password: 'a'.repeat(73),
    });
    expect(errors.map((e) => e.constraints)).toContainEqual(
      expect.objectContaining({
        maxLength: expect.stringMatching(/at most 72/i),
      }),
    );
  });

  it('accepts a password of exactly 72 characters', async () => {
    const errors = await validateRegister({
      email: 'user@example.com',
      password: 'a'.repeat(71) + '1',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects common passwords regardless of case or padding', async () => {
    for (const password of ['password', 'Password1', '  Qwerty123  ']) {
      const errors = await validateRegister({
        email: 'user@example.com',
        password,
      });
      expect(errors.map((e) => e.constraints)).toContainEqual(
        expect.objectContaining({
          isNotCommonPassword: expect.stringMatching(/common passwords/),
        }),
      );
    }
  });
});
