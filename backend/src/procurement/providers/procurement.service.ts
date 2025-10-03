import { Injectable, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcurementRequest } from '../entities/procurement-request.entity';
import { CreateProcurementRequestDto } from '../dto/create-procurement-request.dto';
import { ProcurementStatus } from '../enums/procurement-status.enum';
import { UsersService } from '../../users/providers/users.service';
import { ASSET_REGISTRATION_TOKEN, AssetRegistrationService } from '../interfaces/asset-registration.interface';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(ProcurementRequest)
    private readonly procurementRepo: Repository<ProcurementRequest>,
    private readonly usersService: UsersService,
    @Optional() @Inject(ASSET_REGISTRATION_TOKEN)
    private readonly assetRegistrationService?: AssetRegistrationService,
  ) {}

  async createRequest(dto: CreateProcurementRequestDto, requestedById: string): Promise<ProcurementRequest> {
    const user = await this.usersService.findUserById(requestedById);
    if (!user) {
      throw new NotFoundException('Requesting user not found');
    }

    const request = this.procurementRepo.create({
      itemName: dto.itemName,
      quantity: dto.quantity,
      requestedBy: user,
      status: ProcurementStatus.PENDING,
    });

    return await this.procurementRepo.save(request);
  }

  async approveRequest(id: string): Promise<ProcurementRequest> {
    const request = await this.procurementRepo.findOne({ where: { id }, relations: ['requestedBy'] });
    if (!request) {
      throw new NotFoundException('Procurement request not found');
    }
    if (request.status !== ProcurementStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    request.status = ProcurementStatus.APPROVED;
    const saved = await this.procurementRepo.save(request);

    // Link to asset registration if service is provided
    if (this.assetRegistrationService) {
      // Fire-and-forget but await to ensure consistency; wrap errors to avoid blocking core flow
      try {
        await this.assetRegistrationService.registerAsset({
          procurementRequestId: saved.id,
          itemName: saved.itemName,
          quantity: saved.quantity,
          requestedById: saved.requestedBy.id,
        });
      } catch (e) {
        // Do not fail approval if asset registration downstream fails; in a real system consider outbox/retry
      }
    }

    return saved;
  }

  async rejectRequest(id: string): Promise<ProcurementRequest> {
    const request = await this.procurementRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Procurement request not found');
    }
    if (request.status !== ProcurementStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    request.status = ProcurementStatus.REJECTED;
    return await this.procurementRepo.save(request);
  }

  async findById(id: string): Promise<ProcurementRequest> {
    const request = await this.procurementRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Procurement request not found');
    }
    return request;
  }
}