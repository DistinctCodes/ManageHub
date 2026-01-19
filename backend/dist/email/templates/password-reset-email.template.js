"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasswordResetEmailTemplate = void 0;
const getPasswordResetEmailTemplate = (name, resetLink, year) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - ManageHub</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Hi ${name},</h2>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    We received a request to reset the password for your ManageHub account.
                  </p>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                    Click the button below to create a new password:
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px 0;">
                        <a href="${resetLink}" 
                           style="background: #667eea; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative Link -->
                  <p style="color: #777777; line-height: 1.6; margin: 0 0 10px 0; font-size: 14px;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea; margin: 0 0 30px 0;">
                    ${resetLink}
                  </p>
                  
                  <!-- Warning Box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fff8e1; border-left: 4px solid #ffc107; margin: 0 0 30px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <p style="color: #856404; margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;">
                          <strong>⚠️ Important Security Information:</strong>
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.6;">
                          <li>This link will expire in 1 hour</li>
                          <li>Never share this link with anyone</li>
                          <li>If you didn't request this reset, ignore this email</li>
                          <li>Your password won't change until you create a new one</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Security Notice -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #e3f2fd; border-left: 4px solid #2196f3; margin: 0 0 30px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <p style="color: #1565c0; margin: 0; font-size: 14px; line-height: 1.5;">
                          <strong>🔒 Didn't request this?</strong><br>
                          If you didn't request a password reset, please ignore this email. Your password will remain unchanged. If you're concerned about your account security, please contact our support team immediately.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                    For security reasons, this password reset request was sent from IP: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">XXX.XXX.XXX.XXX</code>
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
exports.getPasswordResetEmailTemplate = getPasswordResetEmailTemplate;
//# sourceMappingURL=password-reset-email.template.js.map