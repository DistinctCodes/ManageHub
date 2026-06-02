jest.mock('mjml', () =>
  jest.fn().mockReturnValue({ html: '<html>booking-confirmed</html>', errors: [] }),
);
jest.mock('fs', () => ({
  readFileSync: jest
    .fn()
    .mockReturnValue(
      'Hi {{memberName}}, workspace {{workspaceName}} from {{startDate}} to {{endDate}} costs {{totalAmountNaira}} ref {{bookingReference}}',
    ),
}));

import mjml2html from 'mjml';
import { renderBookingConfirmationEmail } from './booking-confirmation.util';

const mockMjml = mjml2html as jest.MockedFunction<typeof mjml2html>;

const sampleVars = {
  memberName: 'Alice',
  workspaceName: 'The Hub',
  startDate: '2026-07-01',
  endDate: '2026-07-03',
  totalAmountNaira: '50000',
  bookingReference: 'BK-20260701',
};

describe('renderBookingConfirmationEmail', () => {
  it('returns the HTML string from mjml', () => {
    const html = renderBookingConfirmationEmail(sampleVars);
    expect(html).toBe('<html>booking-confirmed</html>');
  });

  it('substitutes all 6 variables before calling mjml', () => {
    renderBookingConfirmationEmail(sampleVars);
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).toContain('Alice');
    expect(arg).toContain('The Hub');
    expect(arg).toContain('2026-07-01');
    expect(arg).toContain('2026-07-03');
    expect(arg).toContain('50000');
    expect(arg).toContain('BK-20260701');
  });

  it('does not contain any unreplaced {{}} placeholders', () => {
    renderBookingConfirmationEmail(sampleVars);
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('throws when mjml returns errors', () => {
    mockMjml.mockReturnValueOnce({
      html: '',
      errors: [{ message: 'bad mjml', tagName: 'mj-x', severity: 'error', line: 1 }],
    } as any);
    expect(() => renderBookingConfirmationEmail(sampleVars)).toThrow('MJML errors');
  });
});
