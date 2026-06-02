import mjml2html from 'mjml';
import { readFileSync } from 'fs';
import { join } from 'path';

export function renderWelcomeEmail(vars: {
  memberName: string;
  loginUrl: string;
  exploreUrl: string;
}): string {
  const templatePath = join(__dirname, 'welcome-email.template.mjml');
  const raw = readFileSync(templatePath, 'utf8')
    .replace(/\{\{memberName\}\}/g, vars.memberName)
    .replace(/\{\{loginUrl\}\}/g, vars.loginUrl)
    .replace(/\{\{exploreUrl\}\}/g, vars.exploreUrl);
  const { html, errors } = mjml2html(raw);
  if (errors.length > 0) {
    throw new Error(`MJML errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }
  return html;
}
