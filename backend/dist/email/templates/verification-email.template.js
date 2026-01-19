"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerificationEmailTemplate = void 0;
const getVerificationEmailTemplate = (name, verificationLink, year) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - ManageHub</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to ManageHub!</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Hi ${name},</h2>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    Thank you for registering with ManageHub. We're excited to have you join our coworking community!
                  </p>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                    To complete your registration and activate your account, please verify your email address by clicking the button below:
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px 0;">
                        <a href="${verificationLink}" 
                           style="background: #667eea; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative Link -->
                  <p style="color: #777777; line-height: 1.6; margin: 0 0 10px 0; font-size: 14px;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea; margin: 0 0 30px 0;">
                    ${verificationLink}
                  </p>
                  
                  <!-- Warning Box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fff8e1; border-left: 4px solid #ffc107; margin: 0 0 30px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                          <strong>⚠️ Important:</strong> This verification link will expire in 24 hours for security reasons.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                    If you didn't create an account with ManageHub, please ignore this email.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">
                    Need help? <a href="mailto:support@managehub.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
                  </p>
                  <p style="color: #adb5bd; margin: 0; font-size: 12px;">
                    © ${year} ManageHub. All rights reserved.<br>
                    Lagos, Nigeria
                  </p>
                  <p style="color: #adb5bd; margin: 10px 0 0 0; font-size: 11px;">
                    You received this email because you signed up for ManageHub.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
exports.getVerificationEmailTemplate = getVerificationEmailTemplate;
//# sourceMappingURL=verification-email.template.js.map