// backend/src/email/templates/welcome-email.template.ts
export const getWelcomeEmailTemplate = (
  name: string,
  loginLink: string,
  year: number,
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ManageHub</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Welcome to ManageHub!</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Hi ${name},</h2>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    Congratulations! Your email has been verified and your ManageHub account is now active.
                  </p>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                    You're now part of Nigeria's premier coworking community. Here's what to do next:
                  </p>
                  
                  <!-- Next Steps -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px; border-radius: 6px;">
                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Your Next Steps:</h3>
                        <ol style="margin: 0; padding-left: 20px; color: #555555; line-height: 1.8;">
                          <li style="margin-bottom: 10px;">Sign in to your account</li>
                          <li style="margin-bottom: 10px;">Complete payment for your membership</li>
                          <li style="margin-bottom: 10px;">Set up biometric authentication at our hub</li>
                          <li>Start enjoying our coworking space!</li>
                        </ol>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px 0;">
                        <a href="${loginLink}" 
                           style="background: #667eea; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                          Sign In Now
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Features -->
                  <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">What You Get:</h3>
                  <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #555555; line-height: 1.8;">
                    <li style="margin-bottom: 8px;">High-speed WiFi and reliable power</li>
                    <li style="margin-bottom: 8px;">Professional workspace environment</li>
                    <li style="margin-bottom: 8px;">Networking opportunities with other professionals</li>
                    <li style="margin-bottom: 8px;">Access to meeting rooms and event spaces</li>
                    <li>Community events and workshops</li>
                  </ul>
                  
                  <p style="color: #555555; line-height: 1.6; margin: 0; font-size: 16px;">
                    If you have any questions, our support team is here to help!
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
