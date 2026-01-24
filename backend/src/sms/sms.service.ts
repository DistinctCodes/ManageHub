// sms/sms.service.ts
import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async sendSMS(phone: string, message: string) {
    await axios.post('https://api.ng.termii.com/api/sms/send', {
      to: phone,
      sms: message,
      api_key: process.env.TERMII_API_KEY,
      from: 'SecureApp',
    });
  }
}
