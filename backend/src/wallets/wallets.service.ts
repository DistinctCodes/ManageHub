import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { WalletAccount } from './entities/wallet-account.entity';
import { WalletLedgerEntry } from './entities/wallet-ledger-entry.entity';
import { WalletLinkChallenge } from './entities/wallet-link-challenge.entity';
import { WalletCustodyType } from './enums/wallet-custody-type.enum';
import { WalletStatus } from './enums/wallet-status.enum';
import { WalletLedgerEntryType } from './enums/wallet-ledger-entry-type.enum';
import { KeyCustodyService } from './key-custody/key-custody.service';

const WALLET_ACCOUNT_USER_ID_CONSTRAINT = 'uq_wallet_accounts_user_id';
const WALLET_ACCOUNT_ADDRESS_CONSTRAINT = 'uq_wallet_accounts_external_address';
const WALLET_LINK_CHALLENGE_NONCE_CONSTRAINT =
  'uq_wallet_link_challenges_nonce';
const POSTGRES_UNIQUE_VIOLATION = '23505';

/** Single asset tracked by the custodial ledger for this issue's scope. */
const LEDGER_ASSET = 'XLM';

export interface WalletStatusView {
  account: WalletAccount | null;
  balance: number;
  currency: string;
}

/**
 * Custodial wallet provisioning + non-custodial linking (issue #1573).
 * Never handles a decrypted secret directly — key generation and signing
 * are delegated to KeyCustodyService, the sole module allowed to do that.
 */
@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(WalletAccount)
    private readonly walletAccountRepository: Repository<WalletAccount>,
    @InjectRepository(WalletLedgerEntry)
    private readonly ledgerRepository: Repository<WalletLedgerEntry>,
    @InjectRepository(WalletLinkChallenge)
    private readonly challengeRepository: Repository<WalletLinkChallenge>,
    private readonly keyCustody: KeyCustodyService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Idempotent under concurrent requests: the DB unique constraint on
   * (user_id) is the actual source of truth. A keypair is only ever
   * generated and persisted by the transaction that wins that constraint —
   * the loser recovers here without ever provisioning key material.
   */
  async provisionCustodialWallet(userId: string): Promise<WalletAccount> {
    const existing = await this.walletAccountRepository.findOne({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.walletAccountRepository.manager.transaction(
        (manager) => this.insertCustodialWallet(manager, userId),
      );
    } catch (error) {
      if (
        this.isUniqueViolation(error) &&
        this.violatedConstraint(error) === WALLET_ACCOUNT_USER_ID_CONSTRAINT
      ) {
        const winner = await this.walletAccountRepository.findOne({
          where: { userId },
        });
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  async getWalletStatus(userId: string): Promise<WalletStatusView> {
    const account = await this.walletAccountRepository.findOne({
      where: { userId },
    });
    if (!account) {
      return { account: null, balance: 0, currency: LEDGER_ASSET };
    }
    const balance = await this.getBalance(account.id);
    return { account, balance, currency: LEDGER_ASSET };
  }

  /**
   * Admin-only funding stub: records a ledger credit, it does not move
   * real on-chain funds. Enough to make the payment flows that depend on
   * a funded custodial wallet demoable — see issue #1573's scope note.
   */
  async fundCustodialWallet(
    userId: string,
    amount: number,
    reason: string,
    actorId: string,
  ): Promise<WalletAccount> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        'Funding amount must be a positive integer (minor units)',
      );
    }
    if (!reason?.trim()) {
      throw new BadRequestException('Funding reason is required');
    }

    return this.walletAccountRepository.manager.transaction(
      async (manager) => {
        const account = await manager
          .getRepository(WalletAccount)
          .createQueryBuilder('wallet_account')
          .setLock('pessimistic_write')
          .where('wallet_account.user_id = :userId', { userId })
          .getOne();

        if (!account) {
          throw new NotFoundException('No wallet found for this user');
        }
        if (account.custodyType !== WalletCustodyType.CUSTODIAL) {
          throw new BadRequestException(
            'Only custodial wallets can be funded directly',
          );
        }
        if (account.status !== WalletStatus.ACTIVE) {
          throw new BadRequestException('Wallet is not active');
        }

        await manager.getRepository(WalletLedgerEntry).save(
          manager.getRepository(WalletLedgerEntry).create({
            walletAccountId: account.id,
            type: WalletLedgerEntryType.CREDIT,
            amount,
            currency: LEDGER_ASSET,
            reason,
            actorId,
          }),
        );

        return account;
      },
    );
  }

  async createLinkChallenge(
    userId: string,
  ): Promise<{ nonce: string; expiresAt: Date }> {
    const ttlSeconds = this.config.get<number>(
      'WALLET_LINK_CHALLENGE_TTL_SECONDS',
      300,
    );
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      await this.challengeRepository.save(
        this.challengeRepository.create({
          userId,
          nonce,
          expiresAt,
          consumedAt: null,
        }),
      );
    } catch (error) {
      if (
        this.isUniqueViolation(error) &&
        this.violatedConstraint(error) ===
          WALLET_LINK_CHALLENGE_NONCE_CONSTRAINT
      ) {
        // Astronomically unlikely nonce collision — caller just retries.
        throw new ConflictException(
          'Could not issue a challenge, please try again',
        );
      }
      throw error;
    }

    return { nonce, expiresAt };
  }

  /**
   * Verifies a signed challenge and links (or, for an existing custodial
   * user, upgrades to) an external wallet. The challenge row is locked for
   * the duration of the check-and-consume so a captured signature can
   * never be replayed to link twice, even under concurrent requests.
   */
  async verifyAndLinkExternalWallet(
    userId: string,
    nonce: string,
    address: string,
    signatureBase64: string,
  ): Promise<WalletAccount> {
    if (!StrKey.isValidEd25519PublicKey(address)) {
      throw new BadRequestException('Not a valid Stellar public address');
    }

    try {
      return await this.walletAccountRepository.manager.transaction(
        async (manager) => {
          const challenge = await this.claimChallenge(manager, userId, nonce);
          this.verifySignature(address, nonce, signatureBase64);
          return this.upsertExternalWallet(manager, userId, address, challenge);
        },
      );
    } catch (error) {
      if (
        this.isUniqueViolation(error) &&
        this.violatedConstraint(error) === WALLET_ACCOUNT_ADDRESS_CONSTRAINT
      ) {
        throw new ConflictException(
          'This wallet address is already linked to another account',
        );
      }
      throw error;
    }
  }

  private async insertCustodialWallet(
    manager: EntityManager,
    userId: string,
  ): Promise<WalletAccount> {
    const repository = manager.getRepository(WalletAccount);
    const account = await repository.save(
      repository.create({
        userId,
        address: 'pending',
        custodyType: WalletCustodyType.CUSTODIAL,
        status: WalletStatus.PENDING,
      }),
    );

    const address = await this.keyCustody.provisionKeypair(
      account.id,
      manager,
    );

    account.address = address;
    account.status = WalletStatus.ACTIVE;
    return repository.save(account);
  }

  private async getBalance(walletAccountId: string): Promise<number> {
    const result = await this.ledgerRepository
      .createQueryBuilder('entry')
      .select(
        `COALESCE(SUM(CASE WHEN entry.type = 'CREDIT' THEN entry.amount ELSE -entry.amount END), 0)`,
        'balance',
      )
      .where('entry.wallet_account_id = :walletAccountId', {
        walletAccountId,
      })
      .getRawOne<{ balance: string }>();
    return Number(result?.balance ?? 0);
  }

  private async claimChallenge(
    manager: EntityManager,
    userId: string,
    nonce: string,
  ): Promise<WalletLinkChallenge> {
    const challenge = await manager
      .getRepository(WalletLinkChallenge)
      .createQueryBuilder('challenge')
      .setLock('pessimistic_write')
      .where('challenge.nonce = :nonce', { nonce })
      .getOne();

    if (!challenge || challenge.userId !== userId) {
      throw new BadRequestException('Invalid or unknown challenge');
    }
    if (challenge.consumedAt) {
      throw new ConflictException('This challenge has already been used');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This challenge has expired');
    }

    challenge.consumedAt = new Date();
    return manager.getRepository(WalletLinkChallenge).save(challenge);
  }

  private verifySignature(
    address: string,
    nonce: string,
    signatureBase64: string,
  ): void {
    let valid: boolean;
    try {
      const keypair = Keypair.fromPublicKey(address);
      valid = keypair.verify(
        Buffer.from(nonce, 'utf8'),
        Buffer.from(signatureBase64, 'base64'),
      );
    } catch {
      valid = false;
    }
    if (!valid) {
      throw new BadRequestException('Signature verification failed');
    }
  }

  private async upsertExternalWallet(
    manager: EntityManager,
    userId: string,
    address: string,
    _challenge: WalletLinkChallenge,
  ): Promise<WalletAccount> {
    const repository = manager.getRepository(WalletAccount);
    const existing = await repository
      .createQueryBuilder('wallet_account')
      .setLock('pessimistic_write')
      .where('wallet_account.user_id = :userId', { userId })
      .getOne();

    if (!existing) {
      return repository.save(
        repository.create({
          userId,
          address,
          custodyType: WalletCustodyType.EXTERNAL,
          status: WalletStatus.ACTIVE,
        }),
      );
    }

    if (existing.custodyType === WalletCustodyType.EXTERNAL) {
      if (existing.address === address) {
        return existing;
      }
      throw new ConflictException(
        'An external wallet is already linked to this account',
      );
    }

    // Custodial -> external upgrade path: the custodial key material and
    // ledger entries are left in place for audit history; only the
    // account's active custody pointer changes.
    existing.address = address;
    existing.custodyType = WalletCustodyType.EXTERNAL;
    existing.status = WalletStatus.ACTIVE;
    return repository.save(existing);
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as any)?.code ?? (error as any)?.driverError?.code;
    return code === POSTGRES_UNIQUE_VIOLATION;
  }

  private violatedConstraint(error: unknown): string | undefined {
    return (
      (error as any)?.constraint ?? (error as any)?.driverError?.constraint
    );
  }
}
