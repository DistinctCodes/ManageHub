import mjml2html from 'mjml';
import { readFileSync } from 'fs';
import { join } from 'path';

export function renderPasswordResetEmail(vars: {
  memberName: string;
  resetUrl: string;
  expiryMinutes: number;
}): string {
  const templatePath = join(__dirname, 'password-reset.template.mjml');
  const raw = readFileSync(templatePath, 'utf8')
    .replace(/\{\{memberName\}\}/g, vars.memberName)
    .replace(/\{\{resetUrl\}\}/g, vars.resetUrl)
    .replace(/\{\{expiryMinutes\}\}/g, String(vars.expiryMinutes));
  const { html, errors } = mjml2html(raw);
  if (errors.length > 0) {
    throw new Error(`MJML errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }
  return html;
}
