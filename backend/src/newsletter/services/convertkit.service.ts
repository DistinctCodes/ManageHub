import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

export interface ConvertKitSubscribeResponse {
  subscription: {
    id: number;
    state: string;
    created_at: string;
    source: string;
    referrer: string;
    subscribable_id: number;
    subscribable_type: string;
    subscriber: {
      id: number;
      first_name: string;
      email_address: string;
      state: string;
      created_at: string;
      fields: Record<string, any>;
    };
  };
}

@Injectable()
export class ConvertKitService {
  private readonly logger = new Logger(ConvertKitService.name);
  private readonly baseUrl = 'https://api.convertkit.com/v3';
  private readonly apiKey: string;
  private readonly formId: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CONVERTKIT_API_KEY');
    this.formId = this.configService.get<string>('CONVERTKIT_FORM_ID');

    if (!this.apiKey || !this.formId) {
      this.logger.warn(
        'ConvertKit API key or Form ID not configured. Newsletter subscription will not work.',
      );
    }
  }

  async subscribeToNewsletter(
    email: string,
    firstName?: string,
  ): Promise<ConvertKitSubscribeResponse> {
    if (!this.apiKey || !this.formId) {
      throw new HttpException(
        'ConvertKit API is not properly configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const payload = {
        api_key: this.apiKey,
        email,
        ...(firstName && { first_name: firstName }),
      };

      this.logger.log(
        `Subscribing email: ${email} to ConvertKit form: ${this.formId}`,
      );

      const response: AxiosResponse<ConvertKitSubscribeResponse> =
        await axios.post(
          `${this.baseUrl}/forms/${this.formId}/subscribe`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 seconds timeout
          },
        );

      this.logger.log(`Successfully subscribed ${email} to newsletter`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to subscribe ${email} to ConvertKit:`,
        error.message,
      );

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || 'ConvertKit API error';

        // Handle specific ConvertKit error cases
        if (status === 400) {
          throw new HttpException(
            `Invalid request: ${message}`,
            HttpStatus.BAD_REQUEST,
          );
        } else if (status === 401) {
          throw new HttpException(
            'ConvertKit API authentication failed',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        } else if (status === 422) {
          // Usually means the email is already subscribed or invalid
          throw new HttpException(
            `Subscription failed: ${message}`,
            HttpStatus.CONFLICT,
          );
        }
      }

      // Network or timeout errors
      throw new HttpException(
        'Failed to connect to newsletter service. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async checkSubscriptionStatus(email: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/subscribers`, {
        params: {
          api_key: this.apiKey,
          email_address: email,
        },
        timeout: 5000,
      });

      return response.data.total_subscribers > 0;
    } catch (error) {
      this.logger.warn(
        `Failed to check subscription status for ${email}:`,
        error.message,
      );
      return false;
    }
  }
}
