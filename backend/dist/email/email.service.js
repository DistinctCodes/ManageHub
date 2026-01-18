"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST'),
            port: this.configService.get('SMTP_PORT'),
            secure: false,
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASSWORD'),
            },
        });
    }
    async sendVerificationEmail(to, name, token) {
        const frontendUrl = this.configService.get('FRONTEND_URL');
        const verificationLink = `${frontendUrl}/auth/verify-email?token=${token}`;
        const mailOptions = {
            from: `"ManageHub" <${this.configService.get('EMAIL_FROM')}>`,
            to,
            subject: 'Verify your ManageHub account',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to ManageHub!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>
            
            <p>Thank you for registering with ManageHub. We're excited to have you join our coworking community!</p>
            
            <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
              ${verificationLink}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Note:</strong> This link will expire in 24 hours for security reasons.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't create an account with ManageHub, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ManageHub. All rights reserved.<br>
              Lagos, Nigeria
            </p>
          </div>
        </body>
        </html>
      `,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Verification email sent to ${to}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send verification email to ${to}:`, error);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map