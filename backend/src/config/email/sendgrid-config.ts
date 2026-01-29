import 'dotenv/config';
import * as sgMail from '@sendgrid/mail';

const { SENDGRID_API_KEY, SENDGRID_SENDER } = process.env;

if (!SENDGRID_API_KEY || !SENDGRID_SENDER) {
  throw new Error('Missing SendGrid environment variables');
}

sgMail.setApiKey(SENDGRID_API_KEY);

export const sendgridClient = sgMail;
export const sendgridSender = SENDGRID_SENDER;
