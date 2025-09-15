import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';
import { EventRegistrationResponse } from './event-registration-response.entity';

export enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  PHONE = 'phone',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  FILE = 'file',
  URL = 'url',
}

export enum ValidationRule {
  REQUIRED = 'required',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  MIN_VALUE = 'min_value',
  MAX_VALUE = 'max_value',
  PATTERN = 'pattern',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  FILE_TYPE = 'file_type',
  FILE_SIZE = 'file_size',
}

@Entity('event_registration_forms')
@Index(['eventId'])
@Index(['status'])
export class EventRegistrationForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json' })
  fields: RegistrationFormField[];

  @Column({ type: 'json', nullable: true })
  settings: FormSettings;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  version: number;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status: string;

  @Column({ length: 255 })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @OneToMany(() => EventRegistrationResponse, response => response.form)
  responses: EventRegistrationResponse[];

  // Computed properties
  get totalResponses(): number {
    return this.responses?.length || 0;
  }

  get isPublished(): boolean {
    return this.status === 'published';
  }

  get isDraft(): boolean {
    return this.status === 'draft';
  }

  get isArchived(): boolean {
    return this.status === 'archived';
  }
}

export interface RegistrationFormField {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  order: number;
  options?: FieldOption[];
  validation?: FieldValidation[];
  conditional?: ConditionalLogic;
  defaultValue?: any;
  settings?: FieldSettings;
}

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface FieldValidation {
  rule: ValidationRule;
  value?: any;
  message?: string;
}

export interface ConditionalLogic {
  showIf?: ConditionalRule[];
  hideIf?: ConditionalRule[];
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface FieldSettings {
  maxFiles?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  rows?: number; // for textarea
  columns?: number; // for layout
  prefix?: string;
  suffix?: string;
  step?: number; // for number inputs
  multiple?: boolean; // for select fields
}

export interface FormSettings {
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  layout?: {
    columns?: number;
    spacing?: 'compact' | 'normal' | 'spacious';
  };
  notifications?: {
    sendConfirmationEmail?: boolean;
    confirmationEmailTemplate?: string;
    notifyOrganizer?: boolean;
    organizerEmail?: string;
  };
  submission?: {
    allowMultiple?: boolean;
    requireLogin?: boolean;
    captcha?: boolean;
    saveProgress?: boolean;
  };
  privacy?: {
    dataRetentionDays?: number;
    anonymizeResponses?: boolean;
    shareWithThirdParties?: boolean;
  };
}