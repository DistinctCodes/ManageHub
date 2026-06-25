import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventRegistration, EventRegistrationStatus } from './entities/event-registration.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventRegistration)
    private readonly registrationRepository: Repository<EventRegistration>,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string): Promise<Event> {
    const event = this.eventRepository.create({
      ...createEventDto,
      createdBy: userId,
    });
    return this.eventRepository.save(event);
  }

  async findAll(isPublic = false): Promise<Event[]> {
    if (isPublic) {
      return this.eventRepository.find({ where: { status: EventStatus.PUBLISHED } });
    }
    return this.eventRepository.find();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    Object.assign(event, updateEventDto);
    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
  }

  async register(eventId: string, userId: string): Promise<EventRegistration> {
    const event = await this.findOne(eventId);

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Event is not published');
    }

    const existingRegistration = await this.registrationRepository.findOne({
      where: { eventId, userId },
    });

    if (existingRegistration) {
      throw new ConflictException('You are already registered for this event');
    }

    const registrationCount = await this.registrationRepository.count({
      where: { eventId, status: EventRegistrationStatus.REGISTERED },
    });

    const status =
      registrationCount < event.capacity
        ? EventRegistrationStatus.REGISTERED
        : EventRegistrationStatus.WAITLISTED;

    const registration = this.registrationRepository.create({
      eventId,
      userId,
      status,
    });

    return this.registrationRepository.save(registration);
  }

  async cancelRegistration(eventId: string, userId: string): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { eventId, userId },
    });

    if (!registration) {
      throw new NotFoundException('You are not registered for this event');
    }

    await this.registrationRepository.remove(registration);

    const waitlistedUser = await this.registrationRepository.findOne({
      where: { eventId, status: EventRegistrationStatus.WAITLISTED },
      order: { registeredAt: 'ASC' },
    });

    if (waitlistedUser) {
      waitlistedUser.status = EventRegistrationStatus.REGISTERED;
      await this.registrationRepository.save(waitlistedUser);
    }
  }

  async getRegistrations(eventId: string): Promise<EventRegistration[]> {
    await this.findOne(eventId);
    return this.registrationRepository.find({ where: { eventId } });
  }

  async getMyRegistrations(userId: string): Promise<EventRegistration[]> {
    return this.registrationRepository.find({ where: { userId } });
  }
}