import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContactRepository } from './contact.repository';
import { ContactService } from './contact.service';
import { ContactType } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

describe('ContactService', () => {
  let service: ContactService;
  let repository: ContactRepository;

  const mockContact: Contact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    organization: 'Example Corp',
    designation: 'Manager',
    type: ContactType.INTERNAL,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContactRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findWithFuzzySearch: jest.fn(),
    findByIdWithValidation: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: ContactRepository,
          useValue: mockContactRepository,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    repository = module.get<ContactRepository>(ContactRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a contact successfully', async () => {
      const createContactDto: CreateContactDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1 (234) 567-890',
        organization: 'Example Corp',
        designation: 'Manager',
        type: ContactType.INTERNAL,
        notes: 'Test notes',
      };

      mockContactRepository.findByEmail.mockResolvedValue(null);
      mockContactRepository.create.mockReturnValue(mockContact);
      mockContactRepository.save.mockResolvedValue(mockContact);

      const result = await service.create(createContactDto);

      expect(mockContactRepository.findByEmail).toHaveBeenCalledWith(
        createContactDto.email,
      );
      expect(mockContactRepository.create).toHaveBeenCalledWith({
        ...createContactDto,
        phoneNumber: '+1234567890', // Normalized
      });
      expect(result).toEqual(mockContact);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createContactDto: CreateContactDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
        organization: 'Example Corp',
        designation: 'Manager',
        type: ContactType.INTERNAL,
      };

      mockContactRepository.findByEmail.mockResolvedValue(mockContact);

      await expect(service.create(createContactDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contacts', async () => {
      const mockResult = {
        contacts: [mockContact],
        total: 1,
      };

      mockContactRepository.findWithFuzzySearch.mockResolvedValue(mockResult);

      const result = await service.findAll(
        'search',
        ContactType.INTERNAL,
        1,
        10,
      );

      expect(result).toEqual({
        contacts: [mockContact],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a contact by id', async () => {
      mockContactRepository.findByIdWithValidation.mockResolvedValue(
        mockContact,
      );

      const result = await service.findOne(mockContact.id);

      expect(result).toEqual(mockContact);
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockContactRepository.findByIdWithValidation.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a contact successfully', async () => {
      const updateContactDto: UpdateContactDto = {
        name: 'Jane Doe',
      };

      mockContactRepository.findByIdWithValidation.mockResolvedValue(
        mockContact,
      );
      mockContactRepository.save.mockResolvedValue({
        ...mockContact,
        ...updateContactDto,
      });

      const result = await service.update(mockContact.id, updateContactDto);

      expect(result.name).toBe(updateContactDto.name);
    });

    it('should throw ConflictException when updating email to existing one', async () => {
      const updateContactDto: UpdateContactDto = {
        email: 'existing@example.com',
      };

      const anotherContact = { ...mockContact, id: 'different-id' };

      mockContactRepository.findByIdWithValidation.mockResolvedValue(
        mockContact,
      );
      mockContactRepository.findByEmail.mockResolvedValue(anotherContact);

      await expect(
        service.update(mockContact.id, updateContactDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a contact successfully', async () => {
      mockContactRepository.findByIdWithValidation.mockResolvedValue(
        mockContact,
      );
      mockContactRepository.remove.mockResolvedValue(undefined);

      await service.remove(mockContact.id);

      expect(mockContactRepository.remove).toHaveBeenCalledWith(mockContact);
    });
  });

  describe('getContactsByType', () => {
    it('should return contacts by type', async () => {
      mockContactRepository.find.mockResolvedValue([mockContact]);

      const result = await service.getContactsByType(ContactType.INTERNAL);

      expect(result).toEqual([mockContact]);
      expect(mockContactRepository.find).toHaveBeenCalledWith({
        where: { type: ContactType.INTERNAL },
        order: { name: 'ASC' },
      });
    });
  });

  describe('getContactStats', () => {
    it('should return contact statistics', async () => {
      mockContactRepository.count.mockResolvedValueOnce(10); // Total
      mockContactRepository.count.mockResolvedValueOnce(3); // Internal
      mockContactRepository.count.mockResolvedValueOnce(2); // Vendor
      mockContactRepository.count.mockResolvedValueOnce(3); // Regulator
      mockContactRepository.count.mockResolvedValueOnce(2); // Other

      const result = await service.getContactStats();

      expect(result).toEqual({
        total: 10,
        byType: {
          [ContactType.INTERNAL]: 3,
          [ContactType.VENDOR]: 2,
          [ContactType.REGULATOR]: 3,
          [ContactType.OTHER]: 2,
        },
      });
    });
  });
});
