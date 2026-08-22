import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { WalletsService } from './wallets.service';
import { WalletAccount } from './entities/wallet-account.entity';
import { WalletLedgerEntry } from './entities/wallet-ledger-entry.entity';
import { WalletLinkChallenge } from './entities/wallet-link-challenge.entity';
import { WalletCustodyType } from './enums/wallet-custody-type.enum';
import { WalletStatus } from './enums/wallet-status.enum';

function uniqueViolation(constraint: string) {
  return Object.assign(
    new Error('duplicate key value violates unique constraint'),
    { code: '23505', constraint },
  );
}

function makeAccount(overrides: Partial<WalletAccount> = {}): WalletAccount {
  return {
    id: 'wallet-1',
    userId: 'user-1',
    address: 'GCUSTODIALADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    custodyType: WalletCustodyType.CUSTODIAL,
    status: WalletStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as WalletAccount;
}

function makeChallenge(
  overrides: Partial<WalletLinkChallenge> = {},
): WalletLinkChallenge {
  return {
    id: 'challenge-1',
    userId: 'user-1',
    nonce: 'nonce-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    createdAt: new Date(),
    ...overrides,
  } as WalletLinkChallenge;
}

describe('WalletsService', () => {
  let walletAccountRepository: any;
  let ledgerRepository: any;
  let challengeRepository: any;
  let keyCustody: { provisionKeypair: jest.Mock; sign: jest.Mock };
  let config: { get: jest.Mock };
  let service: WalletsService;
  let transaction: jest.Mock;

  function build() {
    service = new WalletsService(
      walletAccountRepository,
      ledgerRepository,
      challengeRepository,
      keyCustody as any,
      config as any,
    );
  }

  beforeEach(() => {
    transaction = jest.fn(async (cb: (m: any) => unknown) => cb(undefined));
    walletAccountRepository = {
      findOne: jest.fn(),
      manager: { transaction },
    };
    ledgerRepository = {
      createQueryBuilder: jest.fn(),
    };
    challengeRepository = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (entity: any) => ({ id: 'challenge-1', ...entity })),
    };
    keyCustody = {
      provisionKeypair: jest.fn().mockResolvedValue('GNEWLYPROVISIONEDADDR'),
      sign: jest.fn(),
    };
    config = { get: jest.fn().mockReturnValue(300) };
    build();
  });

  describe('provisionCustodialWallet', () => {
    it('returns the existing wallet without starting a transaction when already provisioned', async () => {
      const existing = makeAccount();
      walletAccountRepository.findOne.mockResolvedValueOnce(existing);

      const result = await service.provisionCustodialWallet('user-1');

      expect(result).toBe(existing);
      expect(transaction).not.toHaveBeenCalled();
      expect(keyCustody.provisionKeypair).not.toHaveBeenCalled();
    });

    it('creates a new active custodial wallet and provisions its key material', async () => {
      walletAccountRepository.findOne.mockResolvedValueOnce(null);
      let saved: any = null;
      const accountRepo = {
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn(async (entity: any) => {
          saved = { id: saved?.id ?? 'wallet-1', ...entity };
          return saved;
        }),
      };
      const manager = { getRepository: jest.fn().mockReturnValue(accountRepo) };
      transaction.mockImplementationOnce(async (cb: (m: any) => unknown) =>
        cb(manager),
      );

      const result = await service.provisionCustodialWallet('user-1');

      expect(keyCustody.provisionKeypair).toHaveBeenCalledWith(
        'wallet-1',
        manager,
      );
      expect(result.status).toBe(WalletStatus.ACTIVE);
      expect(result.address).toBe('GNEWLYPROVISIONEDADDR');
      expect(result.custodyType).toBe(WalletCustodyType.CUSTODIAL);
    });

    it('recovers the winner instead of provisioning a second keypair when two requests race', async () => {
      const winner = makeAccount({ id: 'wallet-winner' });
      walletAccountRepository.findOne
        .mockResolvedValueOnce(null) // pre-check: not yet committed by the winner
        .mockResolvedValueOnce(winner); // recovery lookup after losing the insert

      const accountRepo = {
        create: jest.fn((data: any) => ({ ...data })),
        save: jest
          .fn()
          .mockRejectedValueOnce(
            uniqueViolation('uq_wallet_accounts_user_id'),
          ),
      };
      const manager = { getRepository: jest.fn().mockReturnValue(accountRepo) };
      transaction.mockImplementationOnce(async (cb: (m: any) => unknown) =>
        cb(manager),
      );

      const result = await service.provisionCustodialWallet('user-1');

      expect(result).toBe(winner);
      expect(keyCustody.provisionKeypair).not.toHaveBeenCalled();
    });
  });

  describe('fundCustodialWallet', () => {
    function makeFundManager(account: WalletAccount | null) {
      const accountQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => account),
      };
      const ledgerRepo = {
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn(async (entity: any) => ({ id: 'entry-1', ...entity })),
      };
      const manager = {
        getRepository: jest.fn((entity: unknown) =>
          entity === WalletAccount
            ? { createQueryBuilder: jest.fn(() => accountQueryBuilder) }
            : ledgerRepo,
        ),
      };
      return { manager, ledgerRepo };
    }

    it('rejects a non-positive amount before touching the database', async () => {
      await expect(
        service.fundCustodialWallet('user-1', 0, 'top-up', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('rejects a missing reason', async () => {
      await expect(
        service.fundCustodialWallet('user-1', 100, '  ', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects funding a wallet that does not exist', async () => {
      const { manager } = makeFundManager(null);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.fundCustodialWallet('user-1', 100, 'top-up', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects funding a non-custodial (external) wallet directly', async () => {
      const { manager } = makeFundManager(
        makeAccount({ custodyType: WalletCustodyType.EXTERNAL }),
      );
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.fundCustodialWallet('user-1', 100, 'top-up', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects funding a wallet that is not active', async () => {
      const { manager } = makeFundManager(
        makeAccount({ status: WalletStatus.PENDING }),
      );
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.fundCustodialWallet('user-1', 100, 'top-up', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('records a CREDIT ledger entry for an active custodial wallet', async () => {
      const account = makeAccount();
      const { manager, ledgerRepo } = makeFundManager(account);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      const result = await service.fundCustodialWallet(
        'user-1',
        1_000_000,
        'admin top-up',
        'admin-1',
      );

      expect(result).toBe(account);
      expect(ledgerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAccountId: account.id,
          type: 'CREDIT',
          amount: 1_000_000,
          reason: 'admin top-up',
          actorId: 'admin-1',
        }),
      );
    });
  });

  describe('getWalletStatus', () => {
    it('reports an unprovisioned wallet as such, with a zero balance', async () => {
      walletAccountRepository.findOne.mockResolvedValueOnce(null);

      const status = await service.getWalletStatus('user-1');

      expect(status).toEqual({ account: null, balance: 0, currency: 'XLM' });
    });

    it('sums the ledger to compute the balance for a provisioned wallet', async () => {
      const account = makeAccount();
      walletAccountRepository.findOne.mockResolvedValueOnce(account);
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ balance: '5000' }),
      };
      ledgerRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const status = await service.getWalletStatus('user-1');

      expect(status).toEqual({ account, balance: 5000, currency: 'XLM' });
    });
  });

  describe('createLinkChallenge', () => {
    it('issues a nonce with the configured TTL', async () => {
      config.get.mockReturnValue(120);
      const before = Date.now();

      const { nonce, expiresAt } = await service.createLinkChallenge('user-1');

      expect(nonce).toHaveLength(64); // 32 random bytes, hex-encoded
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 120_000);
      expect(challengeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', nonce, consumedAt: null }),
      );
    });
  });

  describe('verifyAndLinkExternalWallet', () => {
    function makeLinkManager(
      challenge: WalletLinkChallenge | null,
      existingAccount: WalletAccount | null,
      accountSaveImpl?: jest.Mock,
    ) {
      const challengeQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => challenge),
      };
      const challengeRepo = {
        createQueryBuilder: jest.fn(() => challengeQueryBuilder),
        save: jest.fn(async (entity: any) => entity),
      };
      const accountQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => existingAccount),
      };
      const accountRepo = {
        createQueryBuilder: jest.fn(() => accountQueryBuilder),
        create: jest.fn((data: any) => ({ ...data })),
        save:
          accountSaveImpl ??
          jest.fn(async (entity: any) => ({ id: 'wallet-1', ...entity })),
      };
      const manager = {
        getRepository: jest.fn((entity: unknown) =>
          entity === WalletLinkChallenge ? challengeRepo : accountRepo,
        ),
      };
      return { manager, accountRepo, challengeRepo };
    }

    function signedNonce(nonce: string) {
      const keypair = Keypair.random();
      const signature = keypair
        .sign(Buffer.from(nonce, 'utf8'))
        .toString('base64');
      return { address: keypair.publicKey(), signature };
    }

    it('rejects a non-Stellar address before starting a transaction', async () => {
      await expect(
        service.verifyAndLinkExternalWallet(
          'user-1',
          'nonce-1',
          'not-a-stellar-address',
          'sig',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('links a fresh external wallet given a valid signed challenge', async () => {
      const challenge = makeChallenge();
      const { address, signature } = signedNonce(challenge.nonce);
      const { manager, accountRepo } = makeLinkManager(challenge, null);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      const result = await service.verifyAndLinkExternalWallet(
        'user-1',
        challenge.nonce,
        address,
        signature,
      );

      expect(result.custodyType).toBe(WalletCustodyType.EXTERNAL);
      expect(result.address).toBe(address);
      expect(accountRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ custodyType: WalletCustodyType.EXTERNAL }),
      );
    });

    it('upgrades an existing custodial wallet to external on link', async () => {
      const challenge = makeChallenge();
      const { address, signature } = signedNonce(challenge.nonce);
      const existing = makeAccount({ custodyType: WalletCustodyType.CUSTODIAL });
      const { manager, accountRepo } = makeLinkManager(challenge, existing);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      const result = await service.verifyAndLinkExternalWallet(
        'user-1',
        challenge.nonce,
        address,
        signature,
      );

      expect(result.id).toBe(existing.id);
      expect(accountRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existing.id,
          custodyType: WalletCustodyType.EXTERNAL,
          address,
        }),
      );
    });

    it('rejects an invalid signature without linking anything', async () => {
      const challenge = makeChallenge();
      const { address } = signedNonce(challenge.nonce);
      const { manager, accountRepo } = makeLinkManager(challenge, null);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.verifyAndLinkExternalWallet(
          'user-1',
          challenge.nonce,
          address,
          Buffer.from('not-a-real-signature').toString('base64'),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a replayed (already-consumed) challenge', async () => {
      const challenge = makeChallenge({ consumedAt: new Date() });
      const { address, signature } = signedNonce(challenge.nonce);
      const { manager, accountRepo } = makeLinkManager(challenge, null);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.verifyAndLinkExternalWallet(
          'user-1',
          challenge.nonce,
          address,
          signature,
        ),
      ).rejects.toThrow(ConflictException);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an expired challenge', async () => {
      const challenge = makeChallenge({
        expiresAt: new Date(Date.now() - 1000),
      });
      const { address, signature } = signedNonce(challenge.nonce);
      const { manager, accountRepo } = makeLinkManager(challenge, null);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.verifyAndLinkExternalWallet(
          'user-1',
          challenge.nonce,
          address,
          signature,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an address already claimed by another account', async () => {
      const challenge = makeChallenge();
      const { address, signature } = signedNonce(challenge.nonce);
      const { manager } = makeLinkManager(
        challenge,
        null,
        jest
          .fn()
          .mockRejectedValueOnce(
            uniqueViolation('uq_wallet_accounts_external_address'),
          ),
      );
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.verifyAndLinkExternalWallet(
          'user-1',
          challenge.nonce,
          address,
          signature,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('is idempotent when re-linking the same already-linked address', async () => {
      const challenge = makeChallenge();
      const { address, signature } = signedNonce(challenge.nonce);
      const existing = makeAccount({
        custodyType: WalletCustodyType.EXTERNAL,
        address,
      });
      const { manager, accountRepo } = makeLinkManager(challenge, existing);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      const result = await service.verifyAndLinkExternalWallet(
        'user-1',
        challenge.nonce,
        address,
        signature,
      );

      expect(result).toBe(existing);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('rejects linking a second, different external wallet over an existing link', async () => {
      const challenge = makeChallenge();
      const { address, signature } = signedNonce(challenge.nonce);
      const existing = makeAccount({
        custodyType: WalletCustodyType.EXTERNAL,
        address: 'GDIFFERENTEXTERNALADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      });
      const { manager, accountRepo } = makeLinkManager(challenge, existing);
      transaction.mockImplementationOnce((cb: any) => cb(manager));

      await expect(
        service.verifyAndLinkExternalWallet(
          'user-1',
          challenge.nonce,
          address,
          signature,
        ),
      ).rejects.toThrow(ConflictException);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });
  });
});
