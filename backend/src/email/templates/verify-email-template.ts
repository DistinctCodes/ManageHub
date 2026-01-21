export const getVerifyEmailTemplate = (
  verificationLink: string,
  companyName: string,
): string => `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Welcome to ${companyName}!</h2>
        <p>Thank you for signing up. Please verify your email address to activate your account.</p>
        <p>This link will expire in 24 hours.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" class="button">Verify Email</a>
        </p>
        <p>If the button above doesn't work, copy and paste this link into your browser:</p>
        <p><small>${verificationLink}</small></p>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
