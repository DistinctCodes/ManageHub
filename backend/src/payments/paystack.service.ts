// backend/src/payments/paystack.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    paid_at: string;
    metadata: any;
  };
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY');
  }

  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata?: any,
  ): Promise<PaystackInitializeResponse> {
    const params = JSON.stringify({
      email,
      amount: amount * 100, // Convert to kobo
      reference,
      metadata,
      callback_url: `${this.configService.get('FRONTEND_URL')}/onboarding/payment/verify`,
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(params),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              this.logger.log(`Transaction initialized: ${reference}`);
              resolve(response);
            } else {
              this.logger.error(
                `Paystack initialization failed: ${response.message}`,
              );
              reject(new Error(response.message));
            }
          } catch (error) {
            this.logger.error('Error parsing Paystack response:', error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('Paystack request error:', error);
        reject(error);
      });

      req.write(params);
      req.end();
    });
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              this.logger.log(`Transaction verified: ${reference}`);
              resolve(response);
            } else {
              this.logger.error(
                `Paystack verification failed: ${response.message}`,
              );
              reject(new Error(response.message));
            }
          } catch (error) {
            this.logger.error('Error parsing Paystack response:', error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('Paystack request error:', error);
        reject(error);
      });

      req.end();
    });
  }
}
