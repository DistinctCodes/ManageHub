import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './providers/email.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Public()
  @Get('test-connection')
  @ApiOperation({ summary: 'Test email service connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection() {
    const isConnected = await this.emailService.verifyConnection();
    return {
      success: isConnected,
      message: isConnected 
        ? 'Email service connection successful' 
        : 'Email service connection failed'
    };
  }

  @Public()
  @Post('test-send')
  @ApiOperation({ summary: 'Test sending an email' })
  @ApiResponse({ status: 200, description: 'Email send test result' })
  async testSendEmail(@Body() body: { to: string; name: string }) {
    const emailSent = await this.emailService.sendRegistrationConfirmation(
      body.to,
      body.name
    );
    
    return {
      success: emailSent,
      message: emailSent 
        ? 'Test email sent successfully' 
        : 'Failed to send test email'
    };
  }
}
