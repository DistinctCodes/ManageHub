import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, Between } from 'typeorm';
import { EventRegistrationForm } from '../entities/event-registration-form.entity';
import {
  EventRegistrationResponse,
  ResponseStatus,
} from '../entities/event-registration-response.entity';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import {
  CreateRegistrationFormDto,
  UpdateRegistrationFormDto,
  FormQueryDto,
} from '../dto/create-registration-form.dto';
import {
  CreateRegistrationResponseDto,
  UpdateRegistrationResponseDto,
  ResponseQueryDto,
  BulkUpdateResponseDto,
  ExportResponsesDto,
} from '../dto/create-registration-response.dto';
import {
  FieldType,
  ValidationRule,
  RegistrationFormField,
  FieldValidation,
} from '../entities/event-registration-form.entity';
import { ValidationError } from '../entities/event-registration-response.entity';

export interface FormAnalytics {
  totalResponses: number;
  submittedResponses: number;
  approvedResponses: number;
  rejectedResponses: number;
  averageCompletionTime: number;
  responseRate: number;
  fieldAnalytics: FieldAnalytics[];
  conversionFunnel: ConversionStep[];
}

export interface FieldAnalytics {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
  totalResponses: number;
  skipRate: number;
  averageLength?: number;
  valueDistribution?: Record<string, number>;
  validationErrorRate: number;
}

export interface ConversionStep {
  step: string;
  visitors: number;
  completions: number;
  conversionRate: number;
}

@Injectable()
export class EventRegistrationService {
  private readonly logger = new Logger(EventRegistrationService.name);

  constructor(
    @InjectRepository(EventRegistrationForm)
    private formRepository: Repository<EventRegistrationForm>,
    @InjectRepository(EventRegistrationResponse)
    private responseRepository: Repository<EventRegistrationResponse>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventRsvp)
    private rsvpRepository: Repository<EventRsvp>,
  ) {}

  // Form Management
  async createForm(
    createFormDto: CreateRegistrationFormDto,
  ): Promise<EventRegistrationForm> {
    // Verify event exists
    const event = await this.eventRepository.findOne({
      where: { id: createFormDto.eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Validate fields
    this.validateFormFields(createFormDto.fields);

    const form = this.formRepository.create({
      ...createFormDto,
      version: 1,
    });

    const savedForm = await this.formRepository.save(form);

    this.logger.log(`Registration form created for event ${event.title}`);

    return savedForm;
  }

  async updateForm(
    id: string,
    updateFormDto: UpdateRegistrationFormDto,
  ): Promise<EventRegistrationForm> {
    const form = await this.formRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!form) {
      throw new NotFoundException('Registration form not found');
    }

    // If fields are being updated, validate them
    if (updateFormDto.fields) {
      this.validateFormFields(updateFormDto.fields);

      // Increment version if fields changed
      form.version += 1;
    }

    Object.assign(form, updateFormDto);

    return this.formRepository.save(form);
  }

  async getFormById(id: string): Promise<EventRegistrationForm> {
    const form = await this.formRepository.findOne({
      where: { id },
      relations: ['event', 'responses'],
    });

    if (!form) {
      throw new NotFoundException('Registration form not found');
    }

    return form;
  }

  async getFormsByEvent(eventId: string): Promise<EventRegistrationForm[]> {
    return this.formRepository.find({
      where: { eventId },
      relations: ['responses'],
      order: { createdAt: 'DESC' },
    });
  }

  async getForms(queryDto: FormQueryDto): Promise<{
    forms: EventRegistrationForm[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      limit = 10,
      offset = 0,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = queryDto;

    const where: FindOptionsWhere<EventRegistrationForm> = {};

    // Apply filters
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.status) where.status = filters.status;
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    // Apply search
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const [forms, total] = await this.formRepository.findAndCount({
      where,
      relations: ['event', 'responses'],
      order: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    });

    return {
      forms,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  async deleteForm(id: string): Promise<void> {
    const result = await this.formRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Registration form not found');
    }
  }

  async publishForm(id: string): Promise<EventRegistrationForm> {
    const form = await this.getFormById(id);

    // Validate form before publishing
    this.validateFormForPublishing(form);

    form.status = 'published';
    form.isActive = true;

    return this.formRepository.save(form);
  }

  async archiveForm(id: string): Promise<EventRegistrationForm> {
    const form = await this.getFormById(id);

    form.status = 'archived';
    form.isActive = false;

    return this.formRepository.save(form);
  }

  // Response Management
  async submitResponse(
    createResponseDto: CreateRegistrationResponseDto,
  ): Promise<EventRegistrationResponse> {
    // Get form with validation rules
    const form = await this.formRepository.findOne({
      where: {
        id: createResponseDto.formId,
        eventId: createResponseDto.eventId,
        isActive: true,
      },
    });

    if (!form) {
      throw new NotFoundException(
        'Active registration form not found for this event',
      );
    }

    // Check if multiple responses are allowed
    if (!form.settings?.submission?.allowMultiple) {
      const existingResponse = await this.responseRepository.findOne({
        where: {
          formId: createResponseDto.formId,
          respondentEmail: createResponseDto.respondentEmail,
        },
      });

      if (existingResponse) {
        throw new BadRequestException(
          'Only one response per person is allowed for this form',
        );
      }
    }

    // Validate responses
    const validationErrors = this.validateResponses(
      form.fields,
      createResponseDto.responses,
    );

    const response = this.responseRepository.create({
      ...createResponseDto,
      status:
        validationErrors.length > 0
          ? ResponseStatus.DRAFT
          : ResponseStatus.SUBMITTED,
      submittedAt: validationErrors.length > 0 ? null : new Date(),
      validationErrors,
      isValid: validationErrors.length === 0,
    });

    const savedResponse = await this.responseRepository.save(response);

    this.logger.log(`Registration response submitted for form ${form.name}`);

    return savedResponse;
  }

  async updateResponse(
    id: string,
    updateResponseDto: UpdateRegistrationResponseDto,
  ): Promise<EventRegistrationResponse> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['form'],
    });

    if (!response) {
      throw new NotFoundException('Registration response not found');
    }

    // If responses are being updated, validate them
    if (updateResponseDto.responses) {
      const validationErrors = this.validateResponses(
        response.form.fields,
        updateResponseDto.responses,
      );
      response.validationErrors = validationErrors;
      response.isValid = validationErrors.length === 0;
    }

    // Update review information
    if (
      updateResponseDto.status &&
      updateResponseDto.status !== response.status
    ) {
      response.reviewedAt = new Date();
    }

    Object.assign(response, updateResponseDto);

    return this.responseRepository.save(response);
  }

  async getResponseById(id: string): Promise<EventRegistrationResponse> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['event', 'form', 'rsvp'],
    });

    if (!response) {
      throw new NotFoundException('Registration response not found');
    }

    return response;
  }

  async getResponses(queryDto: ResponseQueryDto): Promise<{
    responses: EventRegistrationResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      limit = 10,
      offset = 0,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'DESC',
      startDate,
      endDate,
      ...filters
    } = queryDto;

    const where: FindOptionsWhere<EventRegistrationResponse> = {};

    // Apply filters
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.formId) where.formId = filters.formId;
    if (filters.rsvpId) where.rsvpId = filters.rsvpId;
    if (filters.respondentEmail)
      where.respondentEmail = filters.respondentEmail;
    if (filters.status) where.status = filters.status;
    if (filters.reviewedBy) where.reviewedBy = filters.reviewedBy;

    // Apply date range
    if (startDate && endDate) {
      where.submittedAt = Between(new Date(startDate), new Date(endDate));
    }

    // Apply search
    if (search) {
      where.respondentName = ILike(`%${search}%`);
    }

    const [responses, total] = await this.responseRepository.findAndCount({
      where,
      relations: ['event', 'form', 'rsvp'],
      order: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    });

    return {
      responses,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  async bulkUpdateResponses(
    bulkUpdateDto: BulkUpdateResponseDto,
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const responseId of bulkUpdateDto.responseIds) {
      try {
        await this.updateResponse(responseId, bulkUpdateDto);
        updated++;
      } catch (error) {
        errors.push(
          `Failed to update response ${responseId}: ${error.message}`,
        );
      }
    }

    return { updated, errors };
  }

  async deleteResponse(id: string): Promise<void> {
    const result = await this.responseRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Registration response not found');
    }
  }

  // Analytics
  async getFormAnalytics(formId: string): Promise<FormAnalytics> {
    const form = await this.getFormById(formId);
    const responses = await this.responseRepository.find({
      where: { formId },
      order: { submittedAt: 'ASC' },
    });

    const totalResponses = responses.length;
    const submittedResponses = responses.filter((r) => r.isSubmitted).length;
    const approvedResponses = responses.filter((r) => r.isApproved).length;
    const rejectedResponses = responses.filter((r) => r.isRejected).length;

    // Calculate average completion time (simplified)
    const completionTimes = responses
      .filter((r) => r.submittedAt && r.createdAt)
      .map((r) => r.submittedAt!.getTime() - r.createdAt.getTime());

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
        : 0;

    // Calculate response rate (would need view/visit tracking)
    const responseRate = 100; // Placeholder

    // Field analytics
    const fieldAnalytics = this.calculateFieldAnalytics(form.fields, responses);

    // Conversion funnel (simplified)
    const conversionFunnel: ConversionStep[] = [
      {
        step: 'Form Views',
        visitors: totalResponses * 2,
        completions: totalResponses,
        conversionRate: 50,
      },
      {
        step: 'Started Form',
        visitors: totalResponses,
        completions: submittedResponses,
        conversionRate: (submittedResponses / totalResponses) * 100,
      },
      {
        step: 'Submitted',
        visitors: submittedResponses,
        completions: approvedResponses,
        conversionRate: (approvedResponses / submittedResponses) * 100,
      },
    ];

    return {
      totalResponses,
      submittedResponses,
      approvedResponses,
      rejectedResponses,
      averageCompletionTime,
      responseRate,
      fieldAnalytics,
      conversionFunnel,
    };
  }

  // Validation
  private validateFormFields(fields: any[]): void {
    if (!fields || fields.length === 0) {
      throw new BadRequestException('Form must have at least one field');
    }

    const fieldIds = new Set<string>();
    for (const field of fields) {
      if (fieldIds.has(field.id)) {
        throw new BadRequestException(`Duplicate field ID: ${field.id}`);
      }
      fieldIds.add(field.id);

      // Validate field-specific requirements
      if (
        field.type === FieldType.SELECT ||
        field.type === FieldType.RADIO ||
        field.type === FieldType.MULTI_SELECT
      ) {
        if (!field.options || field.options.length === 0) {
          throw new BadRequestException(`Field ${field.name} requires options`);
        }
      }
    }
  }

  private validateFormForPublishing(form: EventRegistrationForm): void {
    if (!form.fields || form.fields.length === 0) {
      throw new BadRequestException('Cannot publish form without fields');
    }

    // Check for required fields
    const hasRequiredFields = form.fields.some((field) => field.required);
    if (!hasRequiredFields) {
      throw new BadRequestException(
        'Form should have at least one required field',
      );
    }
  }

  private validateResponses(
    fields: RegistrationFormField[],
    responses: Record<string, any>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      const value = responses[field.id];

      // Check required fields
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({
          fieldId: field.id,
          fieldName: field.name,
          rule: 'required',
          message: `${field.label} is required`,
          value,
        });
        continue;
      }

      // Skip validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Apply field validations
      if (field.validation) {
        for (const validation of field.validation) {
          const error = this.validateFieldValue(field, value, validation);
          if (error) {
            errors.push(error);
          }
        }
      }
    }

    return errors;
  }

  private validateFieldValue(
    field: RegistrationFormField,
    value: any,
    validation: FieldValidation,
  ): ValidationError | null {
    switch (validation.rule) {
      case ValidationRule.MIN_LENGTH:
        if (typeof value === 'string' && value.length < validation.value) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: validation.rule,
            message:
              validation.message ||
              `${field.label} must be at least ${validation.value} characters`,
            value,
          };
        }
        break;

      case ValidationRule.MAX_LENGTH:
        if (typeof value === 'string' && value.length > validation.value) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: validation.rule,
            message:
              validation.message ||
              `${field.label} must be at most ${validation.value} characters`,
            value,
          };
        }
        break;

      case ValidationRule.MIN_VALUE:
        if (typeof value === 'number' && value < validation.value) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: validation.rule,
            message:
              validation.message ||
              `${field.label} must be at least ${validation.value}`,
            value,
          };
        }
        break;

      case ValidationRule.MAX_VALUE:
        if (typeof value === 'number' && value > validation.value) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: validation.rule,
            message:
              validation.message ||
              `${field.label} must be at most ${validation.value}`,
            value,
          };
        }
        break;

      case ValidationRule.PATTERN:
        if (
          typeof value === 'string' &&
          !new RegExp(validation.value).test(value)
        ) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: validation.rule,
            message: validation.message || `${field.label} format is invalid`,
            value,
          };
        }
        break;

      case ValidationRule.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value === 'string' && !emailRegex.test(value)) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: validation.rule,
            message:
              validation.message ||
              `${field.label} must be a valid email address`,
            value,
          };
        }
        break;
    }

    return null;
  }

  private calculateFieldAnalytics(
    fields: RegistrationFormField[],
    responses: EventRegistrationResponse[],
  ): FieldAnalytics[] {
    return fields.map((field) => {
      const fieldResponses = responses
        .map((r) => r.responses[field.id])
        .filter(
          (value) => value !== undefined && value !== null && value !== '',
        );

      const totalResponses = fieldResponses.length;
      const skipRate =
        ((responses.length - totalResponses) / responses.length) * 100;

      const analytics: FieldAnalytics = {
        fieldId: field.id,
        fieldName: field.name,
        fieldType: field.type,
        totalResponses,
        skipRate,
        validationErrorRate: 0, // Would need to calculate from validation errors
      };

      // Field-specific analytics
      if (field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) {
        analytics.averageLength =
          fieldResponses.reduce((sum, val) => sum + String(val).length, 0) /
            totalResponses || 0;
      }

      if (field.type === FieldType.SELECT || field.type === FieldType.RADIO) {
        analytics.valueDistribution = fieldResponses.reduce(
          (acc, val) => {
            acc[String(val)] = (acc[String(val)] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
      }

      return analytics;
    });
  }
}
