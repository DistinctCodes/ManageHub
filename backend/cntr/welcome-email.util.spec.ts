jest.mock('mjml', () =>
  jest.fn().mockReturnValue({ html: '<html>welcome</html>', errors: [] }),
);
jest.mock('fs', () => ({
  readFileSync: jest
    .fn()
    .mockReturnValue(
      'Welcome {{memberName}}! Explore: {{exploreUrl}} Login: {{loginUrl}} You can unsubscribe at any time.',
    ),
}));

import mjml2html from 'mjml';
import { renderWelcomeEmail } from './welcome-email.util';

const mockMjml = mjml2html as jest.MockedFunction<typeof mjml2html>;

describe('renderWelcomeEmail', () => {
  it('returns HTML string from mjml', () => {
    const html = renderWelcomeEmail({
      memberName: 'Alice',
      loginUrl: 'https://example.com/login',
      exploreUrl: 'https://example.com/explore',
    });
    expect(html).toBe('<html>welcome</html>');
  });

  it('substitutes memberName, loginUrl, and exploreUrl before calling mjml', () => {
    renderWelcomeEmail({
      memberName: 'Bob',
      loginUrl: 'https://example.com/login',
      exploreUrl: 'https://example.com/workspaces',
    });
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).toContain('Bob');
    expect(arg).toContain('https://example.com/login');
    expect(arg).toContain('https://example.com/workspaces');
  });

  it('calls mjml exactly once', () => {
    mockMjml.mockClear();
    renderWelcomeEmail({
      memberName: 'Carol',
      loginUrl: 'https://example.com/login',
      exploreUrl: 'https://example.com/explore',
    });
    expect(mockMjml).toHaveBeenCalledTimes(1);
  });

  it('does not contain unreplaced placeholders', () => {
    renderWelcomeEmail({
      memberName: 'Dave',
      loginUrl: 'https://example.com/login',
      exploreUrl: 'https://example.com/explore',
    });
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('throws when mjml returns errors', () => {
    mockMjml.mockReturnValueOnce({
      html: '',
      errors: [{ message: 'invalid', tagName: 'mj-x', severity: 'error', line: 1 }],
    } as any);
    expect(() =>
      renderWelcomeEmail({
        memberName: 'Eve',
        loginUrl: 'https://example.com/login',
        exploreUrl: 'https://example.com/explore',
      }),
    ).toThrow('MJML errors');
  });
});
