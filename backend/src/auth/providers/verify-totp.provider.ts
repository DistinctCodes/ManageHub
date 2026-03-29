import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export class ExchangeRatesProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeRatesProviderError';
  }
}

@Injectable()
export class ExchangeRatesProviderClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.getBaseUrl();
    this.apiKey = this.configService.get<string>(
      'EXCHANGE_RATES_PROVIDER_API_KEY',
    );
    this.timeoutMs = this.getTimeoutMs();
  }

  async fetchRate(
    from: string,
    to: string,
  ): Promise<{
    rate: number;
    fetchedAt: string;
    source: string;
  }> {
    if (this.isFakeMode()) {
      return {
        rate: this.getFakeRate(from, to),
        fetchedAt: new Date().toISOString(),
        source: 'fake-provider',
      };
    }

    const url = this.buildLatestUrl(from, to);
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: this.timeoutMs }),
      );

      const data = response.data ?? null;
      if (!data || data?.success === false) {
        const message = data?.error?.info || 'Provider returned an error';
        throw new ExchangeRatesProviderError(message);
      }

      const rate = this.extractRate(data, to);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new ExchangeRatesProviderError('Provider returned invalid rate');
      }

      return {
        rate,
        fetchedAt: new Date().toISOString(),
        source: this.baseUrl,
      };
    } catch (error: any) {
      if (error instanceof ExchangeRatesProviderError) {
        throw error;
      }
      if (error?.code === 'ECONNABORTED') {
        throw new ExchangeRatesProviderError('Provider request timed out');
      }
      const status = error?.response?.status;
      if (status) {
        throw new ExchangeRatesProviderError(
          `Provider responded with status ${status}`,
        );
      }
      throw new ExchangeRatesProviderError('Failed to fetch exchange rate');
    }
  }

  private extractRate(data: any, to: string): number {
    const symbol = to.toUpperCase();

    if (data?.rates && typeof data.rates[symbol] !== 'undefined') {
      return Number(data.rates[symbol]);
    }

    if (typeof data?.result !== 'undefined') {
      return Number(data.result);
    }

    if (typeof data?.info?.rate !== 'undefined') {
      return Number(data.info.rate);
    }

    return Number.NaN;
  }

  private buildLatestUrl(from: string, to: string): string {
    const url = new URL(this.baseUrl);
    const basePath = url.pathname.endsWith('/')
      ? url.pathname
      : `${url.pathname}/`;
    url.pathname = `${basePath}latest`;
    url.searchParams.set('base', from);
    url.searchParams.set('symbols', to);

    if (this.apiKey) {
      url.searchParams.set('access_key', this.apiKey);
    }

    return url.toString();
  }

  private getBaseUrl(): string {
    const raw = this.configService.get<string>(
      'EXCHANGE_RATES_PROVIDER_BASE_URL',
    );
    const base = raw && raw.trim().length > 0 ? raw.trim() : null;
    return base || 'https://api.exchangerate.host';
  }

  private getTimeoutMs(): number {
    const raw = this.configService.get<string>(
      'EXCHANGE_RATES_PROVIDER_TIMEOUT_MS',
    );
    const parsed = raw ? Number(raw) : 5000;
    if (!Number.isFinite(parsed) || parsed <= 0) return 5000;
    return Math.floor(parsed);
  }

  private isFakeMode(): boolean {
    return (
      this.configService.get<string>('EXCHANGE_RATES_PROVIDER_FAKE_MODE') ===
      'true'
    );
  }

  private getFakeRate(from: string, to: string): number {
    if (from === to) {
      return 1;
    }

    const rates: Record<string, number> = {
      USD_USD: 1,
      USD_NGN: 1500,
      EUR_USD: 1.08,
      EUR_NGN: 1620,
      NGN_USD: 1 / 1500,
      NGN_EUR: 1 / 1620,
      XLM_USD: 0.12,
      XLM_NGN: 180,
    };

    return rates[`${from}_${to}`] ?? 1.25;
  }
}
