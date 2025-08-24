import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ContactRepository } from './contact.repository';
import { Contact, ContactType } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    // Check if email already exists
    const existingContact = await this.contactRepository.findByEmail(
      createContactDto.email,
    );
    if (existingContact) {
      throw new ConflictException('Contact with this email already exists');
    }

    // Normalize phone number (remove spaces, hyphens, parentheses)
    const normalizedPhoneNumber = createContactDto.phoneNumber.replace(
      /[\s\-\(\)]/g,
      '',
    );

    const contact = this.contactRepository.create({
      ...createContactDto,
      phoneNumber: normalizedPhoneNumber,
    });

    return this.contactRepository.save(contact);
  }

  async findAll(
    search?: string,
    type?: ContactType,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    contacts: Contact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (limit > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }

    const { contacts, total } =
      await this.contactRepository.findWithFuzzySearch(
        search,
        type,
        page,
        limit,
      );

    return {
      contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findByIdWithValidation(id);
    if (!contact) {
      throw new NotFoundException(`Contact with ID "${id}" not found`);
    }
    return contact;
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOne(id);

    // If email is being updated, check for conflicts
    if (updateContactDto.email && updateContactDto.email !== contact.email) {
      const existingContact = await this.contactRepository.findByEmail(
        updateContactDto.email,
      );
      if (existingContact) {
        throw new ConflictException('Contact with this email already exists');
      }
    }

    // Normalize phone number if provided
    if (updateContactDto.phoneNumber) {
      updateContactDto.phoneNumber = updateContactDto.phoneNumber.replace(
        /[\s\-\(\)]/g,
        '',
      );
    }

    Object.assign(contact, updateContactDto);
    return this.contactRepository.save(contact);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepository.remove(contact);
  }

  async getContactsByType(type: ContactType): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { type },
      order: { name: 'ASC' },
    });
  }

  async getContactStats(): Promise<{
    total: number;
    byType: Record<ContactType, number>;
  }> {
    const total = await this.contactRepository.count();

    const byType = {} as Record<ContactType, number>;

    for (const type of Object.values(ContactType)) {
      byType[type] = await this.contactRepository.count({ where: { type } });
    }

    return { total, byType };
  }
}
