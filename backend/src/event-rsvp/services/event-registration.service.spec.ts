import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventRegistrationService } from './event-registration.service';
import { EventRegistrationForm } from '../entities/event-registration-form.entity';
import {
  EventRegistrationResponse,
  ResponseStatus,
} from '../entities/event-registration-response.entity';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { CreateRegistrationFormDto } from '../dto/create-registration-form.dto';
import { CreateRegistrationResponseDto } from '../dto/create-registration-response.dto';
import {
  FieldType,
  ValidationRule,
} from '../entities/event-registration-form.entity';

describe('EventRegistrationService', () => {
  let service: EventRegistrationService;
  let formRepository: Repository<EventRegistrationForm>;
  let responseRepository: Repository<EventRegistrationResponse>;
  let eventRepository: Repository<Event>;
  let rsvpRepository: Repository<EventRsvp>;

  const mockEvent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Event',
    startDate: new Date(),
  };

  const mockFormFields = [
    {
      id: 'field1',
      type: FieldType.TEXT,
      name: 'firstName',
      label: 'First Name',
      required: true,
      order: 1,
      validation: [
        {
          rule: ValidationRule.REQUIRED,
          message: 'First name is required',
        },
      ],
    },
    {
      id: 'field2',
      type: FieldType.EMAIL,
      name: 'email',
      label: 'Email Address',
      required: true,
      order: 2,
      validation: [
        {
          rule: ValidationRule.EMAIL,
          message: 'Please enter a valid email',
        },
      ],
    },
    {
      id: 'field3',
      type: FieldType.SELECT,
      name: 'dietary',
      label: 'Dietary Preferences',
      required: false,
      order: 3,
      options: [
        { value: 'none', label: 'No restrictions' },
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'vegan', label: 'Vegan' },
      ],
    },
  ];

  const mockForm = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    eventId: mockEvent.id,
    name: 'Event Registration Form',
    description: 'Please fill out this form to register',
    fields: mockFormFields,
    isActive: true,
    status: 'published',
    createdBy: 'admin@example.com',
  };

  const mockResponse = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    eventId: mockEvent.id,
    formId: mockForm.id,
    rsvpId: null,
    respondentName: 'John Doe',
    respondentEmail: 'john@example.com',
    respondentPhone: null,
    responses: {
      field1: 'John',
      field2: 'john@example.com',
      field3: 'vegetarian',
    },
    attachments: [],
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    validationErrors: [],
    isValid: true,
    score: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    isSubmitted: true,
    isApproved: false,
    isRejected: false,
    isDraft: false,
    hasValidationErrors: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationService,
        {
          provide: getRepositoryToken(EventRegistrationForm),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRegistrationResponse),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRsvp),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventRegistrationService>(EventRegistrationService);
    formRepository = module.get<Repository<EventRegistrationForm>>(
      getRepositoryToken(EventRegistrationForm),
    );
    responseRepository = module.get<Repository<EventRegistrationResponse>>(
      getRepositoryToken(EventRegistrationResponse),
    );
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    rsvpRepository = module.get<Repository<EventRsvp>>(
      getRepositoryToken(EventRsvp),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForm', () => {
    const createFormDto: CreateRegistrationFormDto = {
      eventId: mockEvent.id,
      name: 'Event Registration Form',
      description: 'Please fill out this form to register',
      fields: mockFormFields,
      createdBy: 'admin@example.com',
    };

    it('should create a form successfully', async () => {
      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);
      jest
        .spyOn(formRepository, 'create')
        .mockReturnValue(mockForm as EventRegistrationForm);
      jest
        .spyOn(formRepository, 'save')
        .mockResolvedValue(mockForm as EventRegistrationForm);

      const result = await service.createForm(createFormDto);

      expect(result).toEqual(mockForm);
      expect(formRepository.create).toHaveBeenCalledWith({
        ...createFormDto,
        version: 1,
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createForm(createFormDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no fields provided', async () => {
      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);
      const invalidDto = { ...createFormDto, fields: [] };

      await expect(service.createForm(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate field IDs', async () => {
      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);
      const duplicateFields = [
        { ...mockFormFields[0] },
        { ...mockFormFields[0] }, // Duplicate field
      ];
      const invalidDto = { ...createFormDto, fields: duplicateFields };

      await expect(service.createForm(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for select field without options', async () => {
      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);
      const invalidSelectField = {
        id: 'field1',
        type: FieldType.SELECT,
        name: 'select',
        label: 'Select Field',
        required: true,
        order: 1,
        options: [], // No options provided
      };
      const invalidDto = { ...createFormDto, fields: [invalidSelectField] };

      await expect(service.createForm(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submitResponse', () => {
    const submitResponseDto: CreateRegistrationResponseDto = {
      eventId: mockEvent.id,
      formId: mockForm.id,
      respondentName: 'John Doe',
      respondentEmail: 'john@example.com',
      responses: {
        field1: 'John',
        field2: 'john@example.com',
        field3: 'vegetarian',
      },
    };

    it('should submit response successfully', async () => {
      jest
        .spyOn(formRepository, 'findOne')
        .mockResolvedValue(mockForm as EventRegistrationForm);
      jest.spyOn(responseRepository, 'findOne').mockResolvedValue(null); // No existing response
      jest
        .spyOn(responseRepository, 'create')
        .mockReturnValue(mockResponse as any);
      jest
        .spyOn(responseRepository, 'save')
        .mockResolvedValue(mockResponse as any);

      const result = await service.submitResponse(submitResponseDto);

      expect(result).toEqual(mockResponse);
      expect(responseRepository.create).toHaveBeenCalledWith({
        ...submitResponseDto,
        status: ResponseStatus.SUBMITTED,
        submittedAt: expect.any(Date),
        validationErrors: [],
        isValid: true,
      });
    });

    it('should throw NotFoundException when form not found', async () => {
      jest.spyOn(formRepository, 'findOne').mockResolvedValue(null);

      await expect(service.submitResponse(submitResponseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for duplicate response when not allowed', async () => {
      const formWithoutMultiple = {
        ...mockForm,
        settings: { submission: { allowMultiple: false } },
      };
      jest
        .spyOn(formRepository, 'findOne')
        .mockResolvedValue(formWithoutMultiple as EventRegistrationForm);
      jest
        .spyOn(responseRepository, 'findOne')
        .mockResolvedValue(mockResponse as any);

      await expect(service.submitResponse(submitResponseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle validation errors for required fields', async () => {
      const invalidResponses = {
        field1: '', // Required field is empty
        field2: 'john@example.com',
        field3: 'vegetarian',
      };
      const invalidDto = { ...submitResponseDto, responses: invalidResponses };

      jest
        .spyOn(formRepository, 'findOne')
        .mockResolvedValue(mockForm as EventRegistrationForm);
      jest.spyOn(responseRepository, 'findOne').mockResolvedValue(null);

      const invalidResponse = {
        ...mockResponse,
        responses: invalidResponses,
        status: ResponseStatus.DRAFT,
        submittedAt: null,
        isValid: false,
        validationErrors: [
          {
            fieldId: 'field1',
            fieldName: 'firstName',
            rule: 'required',
            message: 'First Name is required',
            value: '',
          },
        ],
      };

      jest
        .spyOn(responseRepository, 'create')
        .mockReturnValue(invalidResponse as any);
      jest
        .spyOn(responseRepository, 'save')
        .mockResolvedValue(invalidResponse as any);

      const result = await service.submitResponse(invalidDto);

      expect(result.status).toBe(ResponseStatus.DRAFT);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
    });

    it('should validate email field format', async () => {
      const invalidEmail = {
        field1: 'John',
        field2: 'invalid-email', // Invalid email format
        field3: 'vegetarian',
      };
      const invalidDto = { ...submitResponseDto, responses: invalidEmail };

      jest
        .spyOn(formRepository, 'findOne')
        .mockResolvedValue(mockForm as EventRegistrationForm);
      jest.spyOn(responseRepository, 'findOne').mockResolvedValue(null);

      const invalidResponse = {
        ...mockResponse,
        responses: invalidEmail,
        status: ResponseStatus.DRAFT,
        submittedAt: null,
        isValid: false,
        validationErrors: [
          {
            fieldId: 'field2',
            fieldName: 'email',
            rule: 'email',
            message: 'Email Address must be a valid email address',
            value: 'invalid-email',
          },
        ],
      };

      jest
        .spyOn(responseRepository, 'create')
        .mockReturnValue(invalidResponse as any);
      jest
        .spyOn(responseRepository, 'save')
        .mockResolvedValue(invalidResponse as any);

      const result = await service.submitResponse(invalidDto);

      expect(result.status).toBe(ResponseStatus.DRAFT);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].rule).toBe('email');
    });
  });

  describe('publishForm', () => {
    it('should publish form successfully', async () => {
      const draftForm = { ...mockForm, status: 'draft' };
      jest
        .spyOn(service, 'getFormById')
        .mockResolvedValue(draftForm as EventRegistrationForm);
      const publishedForm = {
        ...draftForm,
        status: 'published',
        isActive: true,
      };
      jest
        .spyOn(formRepository, 'save')
        .mockResolvedValue(publishedForm as EventRegistrationForm);

      const result = await service.publishForm(mockForm.id);

      expect(result.status).toBe('published');
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException when publishing form without fields', async () => {
      const emptyForm = { ...mockForm, fields: [] };
      jest
        .spyOn(service, 'getFormById')
        .mockResolvedValue(emptyForm as EventRegistrationForm);

      await expect(service.publishForm(mockForm.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when publishing form without required fields', async () => {
      const optionalOnlyForm = {
        ...mockForm,
        fields: [{ ...mockFormFields[2], required: false }], // Only optional field
      };
      jest
        .spyOn(service, 'getFormById')
        .mockResolvedValue(optionalOnlyForm as EventRegistrationForm);

      await expect(service.publishForm(mockForm.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFormAnalytics', () => {
    it('should return form analytics', async () => {
      const mockResponses = [
        { ...mockResponse, status: ResponseStatus.SUBMITTED },
        { ...mockResponse, status: ResponseStatus.APPROVED },
        { ...mockResponse, status: ResponseStatus.REJECTED },
      ] as any[];

      jest
        .spyOn(service, 'getFormById')
        .mockResolvedValue(mockForm as EventRegistrationForm);
      jest
        .spyOn(responseRepository, 'find')
        .mockResolvedValue(mockResponses as EventRegistrationResponse[]);

      const result = await service.getFormAnalytics(mockForm.id);

      expect(result.totalResponses).toBe(3);
      expect(result.submittedResponses).toBe(3);
      expect(result.approvedResponses).toBe(1);
      expect(result.rejectedResponses).toBe(1);
      expect(result.fieldAnalytics).toHaveLength(mockFormFields.length);
    });
  });

  describe('bulkUpdateResponses', () => {
    it('should update multiple responses successfully', async () => {
      const responseIds = ['resp1', 'resp2'];
      const bulkUpdateDto = {
        responseIds,
        status: ResponseStatus.APPROVED,
        reviewedBy: 'admin@example.com',
      };

      jest
        .spyOn(service, 'updateResponse')
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any);

      const result = await service.bulkUpdateResponses(bulkUpdateDto);

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during bulk update', async () => {
      const responseIds = ['resp1', 'resp2'];
      const bulkUpdateDto = {
        responseIds,
        status: ResponseStatus.APPROVED,
        reviewedBy: 'admin@example.com',
      };

      jest
        .spyOn(service, 'updateResponse')
        .mockResolvedValueOnce(mockResponse as any)
        .mockRejectedValueOnce(new Error('Update failed'));

      const result = await service.bulkUpdateResponses(bulkUpdateDto);

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Update failed');
    });
  });
});
