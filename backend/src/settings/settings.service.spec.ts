import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SettingsService', () => {
  let service: SettingsService;
  let repo: Repository<Setting>;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(Setting), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<SettingsService>(SettingsService);
    repo = module.get<Repository<Setting>>(getRepositoryToken(Setting));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw if key exists', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'theme' });
      await expect(service.create({ key: 'theme', value: 'dark' })).rejects.toThrow(ConflictException);
    });
    it('should create and save if key does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue({ key: 'theme', value: 'dark' });
      mockRepo.save.mockResolvedValue({ key: 'theme', value: 'dark' });
      const result = await service.create({ key: 'theme', value: 'dark' });
      expect(result).toEqual({ key: 'theme', value: 'dark' });
    });
  });

  describe('findAll', () => {
    it('should return all settings', async () => {
      mockRepo.find.mockResolvedValue([{ key: 'theme', value: 'dark' }]);
      const result = await service.findAll();
      expect(result).toEqual([{ key: 'theme', value: 'dark' }]);
    });
  });

  describe('findOne', () => {
    it('should throw if not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);
      await expect(service.findOne('theme')).rejects.toThrow(NotFoundException);
    });
    it('should return setting if found', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'theme', value: 'dark' });
      const result = await service.findOne('theme');
      expect(result).toEqual({ key: 'theme', value: 'dark' });
    });
  });

  describe('update', () => {
    it('should throw if not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);
      await expect(service.update('theme', { value: 'light' })).rejects.toThrow(NotFoundException);
    });
    it('should update and save if found', async () => {
      const setting = { key: 'theme', value: 'dark' };
      mockRepo.findOne.mockResolvedValue(setting);
      mockRepo.save.mockResolvedValue({ key: 'theme', value: 'light' });
      const result = await service.update('theme', { value: 'light' });
      expect(result).toEqual({ key: 'theme', value: 'light' });
    });
  });

  describe('remove', () => {
    it('should throw if not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);
      await expect(service.remove('theme')).rejects.toThrow(NotFoundException);
    });
    it('should remove and return deleted true if found', async () => {
      const setting = { key: 'theme', value: 'dark' };
      mockRepo.findOne.mockResolvedValue(setting);
      mockRepo.remove.mockResolvedValue(setting);
      const result = await service.remove('theme');
      expect(result).toEqual({ deleted: true });
    });
  });
});
