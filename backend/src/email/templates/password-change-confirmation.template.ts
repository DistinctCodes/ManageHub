// backend/src/email/templates/password-change-confirmation.template.ts
export const getPasswordChangeConfirmationTemplate = (
  name: string,
  year: number,
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed - ManageHub</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Password Changed</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Hi ${name},</h2>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    This email confirms that your ManageHub account password was successfully changed.
                  </p>
                  
                  <!-- Success Box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #d1fae5; border-left: 4px solid #10b981; margin: 0 0 30px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <p style="color: #065f46; margin: 0; font-size: 14px; line-height: 1.5;">
                          <strong>✓ Password Updated:</strong> ${new Date().toLocaleString(
                            'en-NG',
                            {
                              dateStyle: 'long',
                              timeStyle: 'short',
                              timeZone: 'Africa/Lagos',
                            },
                          )}
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                    You can now sign in to your account using your new password.
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px 0;">
                        <a href="${process.env.FRONTEND_URL}/auth/login" 
                           style="background: #667eea; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                          Sign In to Your Account
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Security Warning -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fff8e1; border-left: 4px solid #ffc107; margin: 0 0 30px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <p style="color: #856404; margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;">
                          <strong>⚠️ Didn't change your password?</strong>
                        </p>
                        <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                          If you did not make this change, your account may have been compromised. Please contact our support team immediately at <a href="mailto:support@managehub.com" style="color: #667eea;">support@managehub.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                    This is an automated security notification from ManageHub.
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
