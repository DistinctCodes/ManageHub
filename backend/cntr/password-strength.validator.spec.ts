import { IsStrongPassword } from './password-strength.validator';
import { validate } from 'class-validator';

class TestDto { @IsStrongPassword() password: string = ''; }

async function check(password: string) {
  const dto = new TestDto(); dto.password = password;
  return validate(dto);
}

describe('IsStrongPassword', () => {
  it('rejects short password', async () => expect((await check('Ab1!')).length).toBeGreaterThan(0));
  it('rejects missing uppercase', async () => expect((await check('abcdef1!')).length).toBeGreaterThan(0));
  it('rejects missing lowercase', async () => expect((await check('ABCDEF1!')).length).toBeGreaterThan(0));
  it('rejects missing digit', async () => expect((await check('Abcdefg!')).length).toBeGreaterThan(0));
  it('rejects missing special char', async () => expect((await check('Abcdef12')).length).toBeGreaterThan(0));
  it('accepts strong password', async () => expect((await check('Abcdef1!')).length).toBe(0));
});