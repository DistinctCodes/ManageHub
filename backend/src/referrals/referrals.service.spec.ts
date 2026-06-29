import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ReferralsService } from './referrals.service';
import { User } from '../users/entities/user.entity';
import {
  Referral,
  ReferralStatus,
  RewardType,
} from './entities/referral.entity';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
};

const buildUserRepo = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const buildReferralRepo = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((x: Partial<Referral>) => x as Referral),
  save: jest.fn(),
  update: jest.fn(),
});

describe('ReferralsService', () => {
  let service: ReferralsService;
  let userRepo: RepoMock;
  let referralRepo: RepoMock;

  beforeEach(async () => {
    userRepo = buildUserRepo();
    referralRepo = buildReferralRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Referral), useValue: referralRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('https://test.app') },
        },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  describe('ensureReferralCode', () => {
    it('returns existing code without updating', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        referralCode: 'MH-EXIST',
      } as User);

      const code = await service.ensureReferralCode('u1');

      expect(code).toBe('MH-EXIST');
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('generates and persists a new code when missing', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        referralCode: null,
      } as User);
      userRepo.update.mockResolvedValue(undefined as never);

      const code = await service.ensureReferralCode('u1');

      expect(code).toMatch(/^MH-[0-9A-F]{6}$/);
      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        referralCode: code,
      });
    });
  });

  describe('getMyCode', () => {
    it('returns code and shareable url', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        referralCode: 'MH-CODE',
      } as User);

      const result = await service.getMyCode('u1');

      expect(result.referralCode).toBe('MH-CODE');
      expect(result.shareableUrl).toBe('https://test.app/register?ref=MH-CODE');
    });
  });

  describe('createReferral', () => {
    it('records a referral when referrer exists', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'r1',
        referralCode: 'MH-XYZ',
      } as User);
      referralRepo.findOne.mockResolvedValue(null);

      await service.createReferral('MH-XYZ', 'u2');

      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerId: 'r1',
          referredUserId: 'u2',
          code: 'MH-XYZ',
          status: ReferralStatus.PENDING,
        }),
      );
      expect(referralRepo.save).toHaveBeenCalled();
    });

    it('is a no-op when referrer not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await service.createReferral('MH-NOPE', 'u2');

      expect(referralRepo.save).not.toHaveBeenCalled();
    });

    it('is idempotent when referredUserId already has a referral', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'r1',
        referralCode: 'MH-XYZ',
      } as User);
      referralRepo.findOne.mockResolvedValue({ id: 'old' } as Referral);

      await service.createReferral('MH-XYZ', 'u2');

      expect(referralRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('completeReferral', () => {
    it('marks pending referral completed with default reward', async () => {
      const pending = {
        id: 'ref1',
        status: ReferralStatus.PENDING,
        rewardType: null,
        rewardValue: null,
        awardedAt: null,
      } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(pending);
      referralRepo.save.mockResolvedValue(pending);

      await service.completeReferral('u2');

      expect(pending.status).toBe(ReferralStatus.COMPLETED);
      expect(pending.rewardType).toBe(RewardType.DISCOUNT);
      expect(pending.rewardValue).toBe(10);
      expect(pending.awardedAt).toBeInstanceOf(Date);
      expect(referralRepo.save).toHaveBeenCalledWith(pending);
    });

    it('does nothing when no pending referral exists', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await service.completeReferral('u2');

      expect(referralRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('tallies total referrals, conversions and total rewards', async () => {
      referralRepo.find.mockResolvedValue([
        { status: ReferralStatus.PENDING, rewardValue: 0 } as Referral,
        { status: ReferralStatus.COMPLETED, rewardValue: 10 } as Referral,
        { status: ReferralStatus.COMPLETED, rewardValue: 5 } as Referral,
      ]);

      const stats = await service.getStats('u1');

      expect(stats.totalReferrals).toBe(3);
      expect(stats.successfulConversions).toBe(2);
      expect(stats.totalRewardsEarned).toBe(15);
      expect(stats.referrals).toHaveLength(3);
    });
  });
});
