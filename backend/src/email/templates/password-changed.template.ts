export const getPasswordChangedTemplate = (companyName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Successfully Changed</title>
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
            color: #28a745;
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
        .success-icon {
            text-align: center;
            font-size: 60px;
            color: #28a745;
            margin: 20px 0;
        }
        .security-info {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .security-info.warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
        }
        .action-items {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .action-items ul {
            margin: 0;
            padding-left: 20px;
        }
        .action-items li {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✓</div>
            <h1>Password Successfully Changed</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            <p>Your password for your ${companyName} account has been successfully changed.</p>
            
            <div class="security-info">
                <p><strong>Security Information:</strong></p>
                <ul>
                    <li>Your password was changed at ${new Date().toLocaleString()}</li>
                    <li>All existing sessions have been invalidated for your security</li>
                    <li>You will need to log in again on all devices</li>
                </ul>
            </div>
            
            <div class="action-items">
                <p><strong>Recommended Actions:</strong></p>
                <ul>
                    <li>Log in with your new password on all devices you use</li>
                    <li>Ensure your new password is strong and unique</li>
                    <li>Consider enabling two-factor authentication if available</li>
                </ul>
            </div>
            
            <div class="security-info warning">
                <p><strong>Important Security Notice:</strong></p>
                <p>If you didn't make this change, please contact our support team immediately at support@${companyName.toLowerCase().replace(/\s+/g, '')}.com or call our security hotline.</p>
            </div>
            
            <p>Thank you for helping us keep your account secure.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>
            The ${companyName} Security Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;
