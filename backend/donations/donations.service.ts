import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation } from './entities/donation.entity';
import { CreateDonationDto } from './dto/create-donation.dto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
  ) {}

  async create(dto: CreateDonationDto): Promise<Donation> {
    const donation = this.donationRepo.create(dto);
    return this.donationRepo.save(donation);
  }

  async findAll(): Promise<Donation[]> {
    return this.donationRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Donation> {
    const donation = await this.donationRepo.findOne({ where: { id } });
    if (!donation) throw new NotFoundException(`Donation ${id} not found`);
    return donation;
  }
}
