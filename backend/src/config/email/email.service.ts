import * as path from 'path';
import * as fs from 'fs';
import { sendgridClient, sendgridSender } from './sendgrid-config';

export async function loadHtmlTemplate(templateName: string): Promise<string> {
  try {
    const possiblePaths = [
      path.resolve(
        process.cwd(),
        'src/config/email/email-templates',
        `${templateName}.html`,
      ),
      path.resolve(
        process.cwd(),
        'dist/config/email/email-templates',
        `${templateName}.html`,
      ),
    ];

    let templatePath: string | null = null;
    for (const p of possiblePaths) {
      try {
        await fs.promises.access(p, fs.constants.F_OK);
        templatePath = p;
        break;
      } catch {
        /* empty */
      }
    }

    if (!templatePath) {
      throw new Error(`Template "${templateName}" not found in src/ or dist/`);
    }

    const content = await fs.promises.readFile(templatePath, 'utf8');
    if (!content.trim()) {
      throw new Error(`Template "${templateName}" is empty.`);
    }

    return content;
  } catch (error: any) {
    console.error(`Error loading email template "${templateName}":`, error);
    throw new Error(
      `Template "${templateName}" could not be loaded. Check if the file exists and has content.`,
    );
  }
}

export function replacePlaceholders(
  template: string,
  placeholders: Record<string, string>,
): string {
  let content = template;
  Object.keys(placeholders).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, placeholders[key]);
  });
  return content;
}

export async function sendEmail(
  to: string,
  subject: string,
  templateName: string,
  placeholders: Record<string, string>,
) {
  try {
    const template = await loadHtmlTemplate(templateName);
    const htmlContent = replacePlaceholders(template, placeholders);

    const msg = {
      to,
      from: sendgridSender,
      subject,
      html: htmlContent,
    };

    await sendgridClient.send(msg);

    return { success: true, message: `Email sent to ${to}` };
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const errObj = error as { response?: { body?: any }; message?: string };
      console.error(
        'SendGrid email error:',
        errObj.response?.body || errObj.message,
      );
    } else {
      console.error('SendGrid email error:', error);
    }

    return { success: false, error };
  }
}
