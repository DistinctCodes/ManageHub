export const getResetPasswordTemplate = (resetLink: string, companyName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
        }
        .content {
            margin-bottom: 30px;
        }
        .content p {
            margin-bottom: 15px;
            font-size: 16px;
        }
        .reset-button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
        }
        .reset-button:hover {
            background-color: #0056b3;
        }
        .security-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
        }
        .expiry-info {
            color: #dc3545;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset the password for your account associated with this email address.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="reset-button">Reset Password</a>
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetLink}
            </p>
            
            <div class="security-info">
                <p><strong>Security Notice:</strong></p>
                <ul>
                    <li>This link will expire in <span class="expiry-info">1 hour</span> for your security</li>
                    <li>If you didn't request this password reset, please ignore this email</li>
                    <li>Your password will remain unchanged if you don't click the link</li>
                </ul>
            </div>
            
            <p>If you have any questions or concerns, please contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>
            The ${companyName} Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;
