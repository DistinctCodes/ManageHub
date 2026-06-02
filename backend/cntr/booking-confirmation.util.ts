import mjml2html from 'mjml';
import { readFileSync } from 'fs';
import { join } from 'path';

export function renderBookingConfirmationEmail(vars: {
  memberName: string;
  workspaceName: string;
  startDate: string;
  endDate: string;
  totalAmountNaira: string;
  bookingReference: string;
}): string {
  const templatePath = join(__dirname, 'booking-confirmation.template.mjml');
  const raw = readFileSync(templatePath, 'utf8')
    .replace(/\{\{memberName\}\}/g, vars.memberName)
    .replace(/\{\{workspaceName\}\}/g, vars.workspaceName)
    .replace(/\{\{startDate\}\}/g, vars.startDate)
    .replace(/\{\{endDate\}\}/g, vars.endDate)
    .replace(/\{\{totalAmountNaira\}\}/g, vars.totalAmountNaira)
    .replace(/\{\{bookingReference\}\}/g, vars.bookingReference);
  const { html, errors } = mjml2html(raw);
  if (errors.length > 0) {
    throw new Error(`MJML errors: ${errors.map((e: any) => e.message).join(', ')}`);
  }
  return html;
}
