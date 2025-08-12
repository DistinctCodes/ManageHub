import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Repository } from 'typeorm';

const mockJob: Job = {
  id: '1',
  title: 'Backend Developer',
  company: 'OpenAI',
  requirements: 'NestJS, TypeORM, PostgreSQL',
  applicationLink: 'https://example.com/apply',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JobsService', () => {
  let service: JobsService;
  let repo: Repository<Job>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(Job),
          useValue: {
            create: jest.fn().mockReturnValue(mockJob),
            save: jest.fn().mockResolvedValue(mockJob),
            find: jest.fn().mockResolvedValue([mockJob]),
            findOne: jest.fn().mockResolvedValue(mockJob),
            delete: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    repo = module.get<Repository<Job>>(getRepositoryToken(Job));
  });

  it('should create a job', async () => {
    const dto = {
      title: 'Backend Developer',
      company: 'OpenAI',
      requirements: 'NestJS, TypeORM, PostgreSQL',
      applicationLink: 'https://example.com/apply',
    };
    const result = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockJob);
  });

  it('should return all jobs', async () => {
    const result = await service.findAll();
    expect(result).toEqual([mockJob]);
  });

  it('should return one job', async () => {
    const result = await service.findOne('1');
    expect(result).toEqual(mockJob);
  });

  it('should remove a job', async () => {
    await service.remove('1');
    expect(repo.delete).toHaveBeenCalledWith('1');
  });
});
