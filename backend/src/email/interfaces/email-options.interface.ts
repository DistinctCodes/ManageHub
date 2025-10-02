export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}
