import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnersService } from './partners.service';
import { Partner } from './entities/partner.entity';
import { PartnerContact } from './entities/partner-contact.entity';
import { PartnerService } from './entities/partner-service.entity';
import { NotFoundException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('PartnersService', () => {
  let service: PartnersService;
  let partnerRepository: MockRepository<Partner>;
  let contactRepository: MockRepository<PartnerContact>;
  let serviceRepository: MockRepository<PartnerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        {
          provide: getRepositoryToken(Partner),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(PartnerContact),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(PartnerService),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
    partnerRepository = module.get<MockRepository<Partner>>(getRepositoryToken(Partner));
    contactRepository = module.get<MockRepository<PartnerContact>>(getRepositoryToken(PartnerContact));
    serviceRepository = module.get<MockRepository<PartnerService>>(getRepositoryToken(PartnerService));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a partner by id', async () => {
      const partnerId = 'partner-uuid';
      const expectedPartner = {
        id: partnerId,
        name: 'Acme Corp',
        contacts: [],
        services: [],
      };

      partnerRepository.findOne.mockResolvedValue(expectedPartner);

      const result = await service.findOne(partnerId);

      expect(partnerRepository.findOne).toHaveBeenCalledWith({
        where: { id: partnerId },
        relations: ['contacts', 'services'],
      });
      expect(result).toEqual(expectedPartner);
    });

    it('should throw NotFoundException when partner not found', async () => {
      const partnerId = 'non-existent-id';
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(partnerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a partner with contacts and services', async () => {
      const createPartnerDto = {
        name: 'Acme Corp',
        contacts: [
          {
            type: 'email' as any,
            value: 'contact@acme.com',
          },
        ],
        services: [
          {
            name: 'Consulting',
            description: 'Business consulting services',
          },
        ],
      };

      const savedPartner = {
        id: 'partner-uuid',
        name: 'Acme Corp',
        isActive: true,
      };

      const contact = {
        id: 'contact-uuid',
        type: 'email',
        value: 'contact@acme.com',
        partnerId: 'partner-uuid',
      };

      const service = {
        id: 'service-uuid',
        name: 'Consulting',
        description: 'Business consulting services',
        partnerId: 'partner-uuid',
      };

      const partnerWithRelations = {
        ...savedPartner,
        contacts: [contact],
        services: [service],
      };

      partnerRepository.create.mockReturnValue(savedPartner);
      partnerRepository.save.mockResolvedValue(savedPartner);
      contactRepository.create.mockReturnValue(contact);
      serviceRepository.create.mockReturnValue(service);
      partnerRepository.findOne.mockResolvedValue(partnerWithRelations);

      const result = await service.create(createPartnerDto);

      expect(partnerRepository.create).toHaveBeenCalled();
      expect(partnerRepository.save).toHaveBeenCalled();
      expect(contactRepository.create).toHaveBeenCalled();
      expect(serviceRepository.create).toHaveBeenCalled();
      expect(result).toEqual(partnerWithRelations);
    });
  });

  describe('contact management', () => {
    it('should add a contact to a partner', async () => {
      const partnerId = 'partner-uuid';
      const partner = {
        id: partnerId,
        name: 'Acme Corp',
      };
      const contactDto = {
        type: 'email' as any,
        value: 'new@acme.com',
      };
      const contact = {
        ...contactDto,
        id: 'contact-uuid',
        partnerId,
        partner,
      };

      partnerRepository.findOne.mockResolvedValue(partner);
      contactRepository.create.mockReturnValue(contact);
      contactRepository.save.mockResolvedValue(contact);

      const result = await service.addContact(partnerId, contactDto);

      expect(partnerRepository.findOne).toHaveBeenCalled();
      expect(contactRepository.create).toHaveBeenCalledWith({
        ...contactDto,
        partner,
        partnerId,
      });
      expect(contactRepository.save).toHaveBeenCalled();
      expect(result).toEqual(contact);
    });
  });
});
