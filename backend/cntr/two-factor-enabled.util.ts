import mjml2html from 'mjml';
import { readFileSync } from 'fs';
import { join } from 'path';

export function renderTwoFactorEnabledEmail(vars: {
  memberName: string;
  enabledAt: string;
  disableUrl: string;
}): string {
  const templatePath = join(__dirname, 'two-factor-enabled.template.mjml');
  const raw = readFileSync(templatePath, 'utf8')
    .replace(/\{\{memberName\}\}/g, vars.memberName)
    .replace(/\{\{enabledAt\}\}/g, new Date(vars.enabledAt).toLocaleString())
    .replace(/\{\{disableUrl\}\}/g, vars.disableUrl);
  const { html, errors } = mjml2html(raw);
  if (errors.length > 0) {
    throw new Error(`MJML errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }
  return html;
}
