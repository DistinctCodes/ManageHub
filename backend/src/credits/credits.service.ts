import { Injectable } from '@nestjs/common';
import { GetCreditPacksProvider } from './providers/get-credit-packs.provider';
import { PurchaseCreditsProvider } from './providers/purchase-credits.provider';
import { GetCreditBalanceProvider } from './providers/get-credit-balance.provider';
import {
  GetCreditHistoryProvider,
  CreditHistoryQuery,
} from './providers/get-credit-history.provider';
import { CreditPack } from './entities/credit-pack.entity';
import { UserCreditTransaction } from './entities/credit-transaction.entity';

@Injectable()
export class CreditsService {
  constructor(
    private readonly getCreditPacksProvider: GetCreditPacksProvider,
    private readonly purchaseCreditsProvider: PurchaseCreditsProvider,
    private readonly getCreditBalanceProvider: GetCreditBalanceProvider,
    private readonly getCreditHistoryProvider: GetCreditHistoryProvider,
  ) {}

  getCreditPacks(): Promise<CreditPack[]> {
    return this.getCreditPacksProvider.findAllActive();
  }

  purchase(creditPackId: string, userId: string) {
    return this.purchaseCreditsProvider.purchase(creditPackId, userId);
  }

  getBalance(userId: string): Promise<{ remainingHours: number }> {
    return this.getCreditBalanceProvider.getBalance(userId);
  }

  getHistory(
    userId: string,
    query: CreditHistoryQuery,
  ): Promise<{
    data: UserCreditTransaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.getCreditHistoryProvider.find(userId, query);
  }
}
