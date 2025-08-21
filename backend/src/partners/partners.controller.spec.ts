import { Test, TestingModule } from '@nestjs/testing';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/partner.dto';
import { ContactType } from './entities/partner-contact.entity';

describe('PartnersController', () => {
  let controller: PartnersController;
  let service: PartnersService;

  const mockPartnersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addContact: jest.fn(),
    updateContact: jest.fn(),
    removeContact: jest.fn(),
    addService: jest.fn(),
    updateService: jest.fn(),
    removeService: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnersController],
      providers: [
        {
          provide: PartnersService,
          useValue: mockPartnersService,
        },
      ],
    }).compile();

    controller = module.get<PartnersController>(PartnersController);
    service = module.get<PartnersService>(PartnersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new partner', async () => {
      const createPartnerDto: CreatePartnerDto = {
        name: 'Acme Corp',
        description: 'A partner company',
        website: 'https://example.com',
        contacts: [
          {
            type: ContactType.EMAIL,
            value: 'contact@acme.com',
            label: 'Main Contact',
            isPrimary: true,
          },
        ],
        services: [
          {
            name: 'Consulting',
            description: 'Business consulting services',
          },
        ],
      };

      const expectedResult = {
        id: 'partner-uuid',
        ...createPartnerDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult as any);

      const result = await controller.create(createPartnerDto);
      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createPartnerDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of partners', async () => {
      const expectedResult = [
        {
          id: 'partner-uuid-1',
          name: 'Partner 1',
          isActive: true,
        },
        {
          id: 'partner-uuid-2',
          name: 'Partner 2',
          isActive: false,
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult as any);

      const result = await controller.findAll();
      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return only active partners when active=true', async () => {
      const expectedResult = [
        {
          id: 'partner-uuid-1',
          name: 'Partner 1',
          isActive: true,
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult as any);

      const result = await controller.findAll('true');
      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('contact management', () => {
    it('should add a new contact to a partner', async () => {
      const partnerId = 'partner-uuid';
      const contactDto = {
        type: ContactType.EMAIL,
        value: 'new@example.com',
      };

      const expectedResult = {
        id: 'contact-uuid',
        ...contactDto,
        partnerId,
      };

      jest.spyOn(service, 'addContact').mockResolvedValue(expectedResult as any);

      const result = await controller.addContact(partnerId, contactDto);
      expect(result).toEqual(expectedResult);
      expect(service.addContact).toHaveBeenCalledWith(partnerId, contactDto);
    });
  });

  describe('service management', () => {
    it('should add a new service to a partner', async () => {
      const partnerId = 'partner-uuid';
      const serviceDto = {
        name: 'New Service',
        description: 'Description of new service',
      };

      const expectedResult = {
        id: 'service-uuid',
        ...serviceDto,
        partnerId,
      };

      jest.spyOn(service, 'addService').mockResolvedValue(expectedResult as any);

      const result = await controller.addService(partnerId, serviceDto);
      expect(result).toEqual(expectedResult);
      expect(service.addService).toHaveBeenCalledWith(partnerId, serviceDto);
    });
  });
});
