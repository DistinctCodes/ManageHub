# Comprehensive Email Notification System - Documentation

## Overview
This email notification system provides a robust, production-ready solution for sending transactional and marketing emails with advanced features including queuing, templating, tracking, and more.

## Features Implemented

### ✅ Core Features
- **Email Queue System** - Using Bull/BullMQ with Redis
- **HTML Email Templates** - Using Handlebars + MJML for responsive designs
- **Multiple Email Types**:
  - Welcome
  - Email Verification
  - Password Reset
  - Password Changed
  - Two-Factor Authentication Enabled
  - Payment Receipt
  - Check-in Summary
  - Account Deactivated
  - Admin Notifications

### ✅ Advanced Features
- **Attachment Support** - Send PDFs, receipts, and other files
- **Retry Logic** - 3 retries with exponential backoff (2s, 4s, 8s)
- **Dead Letter Queue** - Failed emails after max retries
- **Multiple SMTP Providers** - Gmail, SendGrid, AWS SES support
- **Email Tracking** - Sent, delivered, opened, clicked events
- **Unsubscribe Functionality** - Per-user preferences
- **Rate Limiting** - 100 emails per hour per user
- **Development Preview** - Mailtrap integration
- **Bulk Email Sending** - Batch processing with delays
- **Email Analytics** - Open rate, click rate, delivery rate
- **Webhook Handlers** - SendGrid, AWS SES, Mailgun webhooks

## Installation & Setup

### 1. Install Dependencies
Already installed:
```bash
npm install @nestjs/bull bull ioredis handlebars mjml @types/handlebars nodemailer-mjml
```

### 2. Install Redis
Redis is required for the queue system:

**Windows:**
```bash
# Using Chocolatey
choco install redis-64

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
brew services start redis
```

### 3. Configure Environment Variables
Update your `.env` file based on `.env.example`:

```env
# SMTP Configuration (Choose one provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=noreply@yourdomain.com

# For Development (Mailtrap)
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_pass

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Company Info
COMPANY_NAME=ManageHub
SUPPORT_EMAIL=support@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### 4. Start Redis Server
```bash
redis-server
```

### 5. Run Database Migrations
The system will auto-create tables with TypeORM synchronize mode, or run migrations:
```bash
npm run typeorm:run-migrations
```

## Usage Examples

### 1. Send Email via Service

```typescript
import { EmailService } from './email/email.service';
import { EmailType } from './email/entities/email-log.entity';

@Injectable()
export class UserService {
  constructor(private emailService: EmailService) {}

  async registerUser(userData: CreateUserDto) {
    // Create user...
    
    // Queue welcome email
    await this.emailService.queueEmail({
      to: user.email,
      subject: 'Welcome to ManageHub!',
      templateName: 'welcome',
      templateData: {
        username: user.firstname,
        dashboardUrl: 'https://app.yourdomain.com/dashboard',
        supportEmail: 'support@yourdomain.com',
      },
      emailType: EmailType.WELCOME,
      userId: user.id,
    });
  }
}
```

### 2. Send Email with Template

```typescript
await this.emailService.queueEmail({
  to: 'user@example.com',
  subject: 'Reset Your Password',
  templateName: 'reset-password',
  templateData: {
    username: 'John',
    resetLink: 'https://app.yourdomain.com/reset?token=xyz',
    expiryHours: 24,
  },
  emailType: EmailType.PASSWORD_RESET,
  userId: user.id,
});
```

### 3. Send Email with Attachments

```typescript
await this.emailService.queueEmail({
  to: 'customer@example.com',
  subject: 'Your Receipt',
  templateName: 'payment-receipt',
  templateData: {
    username: 'Jane',
    receiptNumber: 'REC-12345',
    amount: '$99.00',
    paymentDate: new Date().toLocaleDateString(),
  },
  emailType: EmailType.PAYMENT_RECEIPT,
  attachments: [
    {
      filename: 'receipt.pdf',
      path: '/path/to/receipt.pdf',
      contentType: 'application/pdf',
    },
  ],
});
```

### 4. Send Bulk Emails

```typescript
import { BulkEmailDto } from './email/dto/bulk-email.dto';

const bulkEmailDto: BulkEmailDto = {
  recipients: [
    { email: 'user1@example.com', userId: 'user1' },
    { email: 'user2@example.com', userId: 'user2' },
    { email: 'user3@example.com', userId: 'user3' },
  ],
  subject: 'Monthly Newsletter',
  templateName: 'welcome',
  templateData: {
    companyName: 'ManageHub',
  },
  emailType: EmailType.MARKETING,
  batchSize: 50, // Send 50 at a time
  delayBetweenBatches: 1000, // 1 second delay
};

await this.emailService.sendBulkEmails(bulkEmailDto);
```

### 5. Update User Email Preferences

```typescript
// Update preferences
await this.emailService.updateEmailPreferences(userId, {
  enableMarketingEmails: false,
  enableWeeklySummary: true,
  enablePromotions: false,
});

// Unsubscribe from all
await this.emailService.unsubscribe(unsubscribeToken);
```

## API Endpoints

### Send Email
```http
POST /email/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "templateName": "welcome",
  "templateData": {
    "username": "John"
  },
  "emailType": "welcome"
}
```

### Send Bulk Emails
```http
POST /email/bulk-send
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipients": [
    { "email": "user1@example.com" },
    { "email": "user2@example.com" }
  ],
  "subject": "Announcement",
  "templateName": "welcome",
  "emailType": "marketing"
}
```

### Get Email Analytics
```http
GET /email/analytics?userId=<userId>&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

Response:
```json
{
  "total": 1000,
  "sent": 980,
  "delivered": 950,
  "opened": 450,
  "clicked": 120,
  "failed": 20,
  "bounced": 10,
  "openRate": 47.37,
  "clickRate": 12.63,
  "deliveryRate": 95.0
}
```

### Get User Email Preferences
```http
GET /email/preferences/<userId>
Authorization: Bearer <token>
```

### Update Email Preferences
```http
PATCH /email/preferences/<userId>
Authorization: Bearer <token>
Content-Type: application/json

{
  "enableMarketingEmails": false,
  "enableWeeklySummary": true
}
```

### Unsubscribe
```http
POST /email/unsubscribe
Content-Type: application/json

{
  "token": "unsubscribe_token_here"
}
```

## Webhook Integration

### SendGrid Webhook
Configure in SendGrid dashboard:
```
POST https://api.yourdomain.com/email/webhook/sendgrid
```

### AWS SES SNS Webhook
Configure SNS topic to POST to:
```
POST https://api.yourdomain.com/email/webhook/ses
```

### Mailgun Webhook
Configure in Mailgun dashboard:
```
POST https://api.yourdomain.com/email/webhook/mailgun
```

## Email Templates

Templates are located in `src/email/templates/` and use MJML + Handlebars.

### Available Templates:
1. **welcome.hbs** - Welcome new users
2. **verify-email.hbs** - Email verification
3. **reset-password.hbs** - Password reset
4. **password-changed.hbs** - Password change notification
5. **two-factor-enabled.hbs** - 2FA enabled notification
6. **payment-receipt.hbs** - Payment confirmations
7. **check-in-summary.hbs** - Attendance summaries
8. **account-deactivated.hbs** - Account deactivation notice

### Template Variables:
Common variables available in all templates:
- `companyName` - Your company name
- `supportEmail` - Support email address
- `frontendUrl` - Frontend application URL
- `year` - Current year
- `unsubscribeUrl` - Unsubscribe link (if userId provided)
- `preferencesUrl` - Email preferences link

## Background Jobs

The system includes several cron jobs:

### Retry Failed Emails
- **Schedule**: Every hour
- **Purpose**: Retry emails that failed but haven't reached max retries

### Clean Up Old Logs
- **Schedule**: Daily at 2 AM
- **Purpose**: Delete email logs older than 90 days

### Process Dead Letter Queue
- **Schedule**: Every 6 hours
- **Purpose**: Handle permanently failed emails

### Queue Health Monitor
- **Schedule**: Every 30 minutes
- **Purpose**: Monitor queue status and alert on issues

### Weekly Summary Emails
- **Schedule**: Every Monday at 9 AM
- **Purpose**: Send weekly summaries to opted-in users

## Monitoring & Debugging

### Check Queue Status
Access the Bull Board dashboard (optional, requires setup):
```bash
npm install @bull-board/express
```

### View Logs
The system logs all email operations:
```bash
# View logs
tail -f logs/email.log
```

### Common Issues

**Redis Connection Failed:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

**Emails Not Sending:**
1. Check SMTP credentials in `.env`
2. Check email logs in database
3. Verify Redis is running
4. Check rate limits

**Template Not Found:**
- Ensure template file exists in `src/email/templates/`
- Check template name matches filename without `.hbs` extension

## Production Considerations

### 1. Use Production SMTP Provider
- Gmail (with app passwords)
- SendGrid (recommended)
- AWS SES (scalable)
- Mailgun

### 2. Set Up Monitoring
- Monitor queue size
- Track failed email rate
- Set up alerts for dead letter queue

### 3. Configure Webhooks
- Set up provider webhooks for accurate tracking
- Verify webhook signatures for security

### 4. Scale Redis
- Use Redis Cluster for high volume
- Consider managed Redis (AWS ElastiCache, Redis Cloud)

### 5. Rate Limiting
- Respect provider rate limits
- Adjust `EMAIL_RATE_LIMIT_PER_HOUR` as needed

## Testing

### Development Testing with Mailtrap
Set `NODE_ENV=development` and configure Mailtrap credentials.

### Send Test Email
```typescript
await this.emailService.queueEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  htmlContent: '<h1>Test</h1>',
  emailType: EmailType.TRANSACTIONAL,
});
```

## Security Best Practices

1. **Never expose SMTP credentials** in client-side code
2. **Verify webhook signatures** from email providers
3. **Sanitize user input** in email templates
4. **Rate limit** email sending endpoints
5. **Use environment variables** for sensitive configuration
6. **Implement unsubscribe** for marketing emails (legal requirement)

## Support

For issues or questions:
- Check logs in database `email_logs` table
- Review Bull queue status
- Contact: support@yourdomain.com

## License
Proprietary - ManageHub Backend
