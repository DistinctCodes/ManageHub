import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { PartnerContact } from './entities/partner-contact.entity';
import { PartnerService } from './entities/partner-service.entity';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { CreatePartnerContactDto, UpdatePartnerContactDto } from './dto/partner-contact.dto';
import { CreatePartnerServiceDto, UpdatePartnerServiceDto } from './dto/partner-service.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private partnersRepository: Repository<Partner>,
    @InjectRepository(PartnerContact)
    private contactsRepository: Repository<PartnerContact>,
    @InjectRepository(PartnerService)
    private servicesRepository: Repository<PartnerService>,
  ) {}

  async create(createPartnerDto: CreatePartnerDto): Promise<Partner> {
    const { contacts, services, ...partnerData } = createPartnerDto;
    
    // Create partner without contacts and services first
    const partner = this.partnersRepository.create(partnerData);
    const savedPartner = await this.partnersRepository.save(partner);
    
    // Create contacts if provided
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        const contactEntity = this.contactsRepository.create({
          ...contact,
          partner: savedPartner,
          partnerId: savedPartner.id,
        });
        await this.contactsRepository.save(contactEntity);
      }
    }
    
    // Create services if provided
    if (services && services.length > 0) {
      for (const service of services) {
        const serviceEntity = this.servicesRepository.create({
          ...service,
          partner: savedPartner,
          partnerId: savedPartner.id,
        });
        await this.servicesRepository.save(serviceEntity);
      }
    }
    
    // Return the partner with all relations
    return this.findOne(savedPartner.id);
  }

  async findAll(activeOnly: boolean = false): Promise<Partner[]> {
    const queryOptions: any = {
      relations: ['contacts', 'services'],
      order: { createdAt: 'DESC' },
    };
    
    if (activeOnly) {
      queryOptions.where = { isActive: true };
    }
    
    return this.partnersRepository.find(queryOptions);
  }

  async findOne(id: string): Promise<Partner> {
    const partner = await this.partnersRepository.findOne({
      where: { id },
      relations: ['contacts', 'services'],
    });
    
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    
    return partner;
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id);
    
    // Update partner properties
    Object.assign(partner, updatePartnerDto);
    
    return this.partnersRepository.save(partner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.findOne(id);
    await this.partnersRepository.remove(partner);
  }

  // Contact management
  async addContact(partnerId: string, createContactDto: CreatePartnerContactDto): Promise<PartnerContact> {
    const partner = await this.findOne(partnerId);
    
    const contact = this.contactsRepository.create({
      ...createContactDto,
      partner,
      partnerId,
    });
    
    return this.contactsRepository.save(contact);
  }

  async updateContact(contactId: string, updateContactDto: UpdatePartnerContactDto): Promise<PartnerContact> {
    const contact = await this.contactsRepository.findOne({ where: { id: contactId } });
    
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
    
    Object.assign(contact, updateContactDto);
    
    return this.contactsRepository.save(contact);
  }

  async removeContact(contactId: string): Promise<void> {
    const contact = await this.contactsRepository.findOne({ where: { id: contactId } });
    
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
    
    await this.contactsRepository.remove(contact);
  }

  // Service management
  async addService(partnerId: string, createServiceDto: CreatePartnerServiceDto): Promise<PartnerService> {
    const partner = await this.findOne(partnerId);
    
    const service = this.servicesRepository.create({
      ...createServiceDto,
      partner,
      partnerId,
    });
    
    return this.servicesRepository.save(service);
  }

  async updateService(serviceId: string, updateServiceDto: UpdatePartnerServiceDto): Promise<PartnerService> {
    const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
    
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }
    
    Object.assign(service, updateServiceDto);
    
    return this.servicesRepository.save(service);
  }

  async removeService(serviceId: string): Promise<void> {
    const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
    
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }
    
    await this.servicesRepository.remove(service);
  }
}
