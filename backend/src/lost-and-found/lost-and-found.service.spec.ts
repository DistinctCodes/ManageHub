// src/lost-and-found/lost-and-found.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LostAndFoundService } from './lost-and-found.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LostItem } from './entities/lost-item.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LostAndFoundService', () => {
  let service: LostAndFoundService;
  let repo: Repository<LostItem>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LostAndFoundService,
        {
          provide: getRepositoryToken(LostItem),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<LostAndFoundService>(LostAndFoundService);
    repo = module.get<Repository<LostItem>>(getRepositoryToken(LostItem));
  });

  it('should report a lost item', async () => {
    const dto = { description: 'Black Wallet', dateFound: new Date() };
    const savedItem = { id: '1', ...dto, claimed: false };
    mockRepo.create.mockReturnValue(savedItem);
    mockRepo.save.mockResolvedValue(savedItem);

    expect(await service.reportItem(dto as any)).toEqual(savedItem);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
    expect(mockRepo.save).toHaveBeenCalledWith(savedItem);
  });

  it('should find all lost items', async () => {
    const items = [{ id: '1' }, { id: '2' }];
    mockRepo.find.mockResolvedValue(items);

    expect(await service.findAll()).toEqual(items);
    expect(mockRepo.find).toHaveBeenCalled();
  });

  it('should throw NotFoundException when item not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
  });

  it('should claim an unclaimed item', async () => {
    const item = { id: '1', claimed: false };
    mockRepo.findOne.mockResolvedValue(item);
    mockRepo.save.mockResolvedValue({ ...item, claimed: true, claimedBy: 'John Doe' });

    const result = await service.claimItem('1', { claimedBy: 'John Doe' });
    expect(result.claimed).toBe(true);
    expect(result.claimedBy).toBe('John Doe');
  });

  it('should throw BadRequestException if item already claimed', async () => {
    mockRepo.findOne.mockResolvedValue({ id: '1', claimed: true });
    await expect(service.claimItem('1', { claimedBy: 'John' })).rejects.toThrow(BadRequestException);
  });
});
