import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeUsage } from './entities/promo-code-usage.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';
import { ApplyPromoCodeDto } from './dto/apply-promo-code.dto';
import { DiscountType } from './enums/discount-type.enum';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Booking } from '../bookings/entities/booking.entity';

export interface ValidatePromoCodeResponse {
  valid: boolean;
  discountType?: DiscountType;
  discountValue?: number;
  finalAmount?: number;
  message: string;
}

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoCodesRepository: Repository<PromoCode>,
    @InjectRepository(PromoCodeUsage)
    private readonly usagesRepository: Repository<PromoCodeUsage>,
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  async applyToBooking(dto: ApplyPromoCodeDto, userId: string): Promise<{ discountKobo: number; finalAmount: number }> {
    const validateResult = await this.validate(
      { code: dto.code, bookingAmount: dto.bookingAmount },
      userId,
    );
    if (!validateResult.valid) throw new BadRequestException(validateResult.message);

    const promoCode = await this.findByCode(dto.code);
    if (!promoCode) throw new NotFoundException('Promo code not found');

    const discountKobo = dto.bookingAmount - (validateResult.finalAmount ?? dto.bookingAmount);
    await this.bookingRepository.update(dto.bookingId, {
      appliedPromoCodeId: promoCode.id,
      promoDiscountApplied: discountKobo,
      totalAmount: validateResult.finalAmount ?? dto.bookingAmount,
    });

    await this.recordUsage(promoCode.id, userId, dto.bookingId, discountKobo);

    return { discountKobo, finalAmount: validateResult.finalAmount ?? dto.bookingAmount };
  }

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const code = dto.code.toUpperCase();
    const existing = await this.promoCodesRepository.findOne({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Promo code "${code}" already exists`);
    }

    const promoCode = this.promoCodesRepository.create({
      ...dto,
      code,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      maxUses: dto.maxUses ?? null,
      minBookingAmount: dto.minBookingAmount ?? 0,
      applicableWorkspaceTypes: dto.applicableWorkspaceTypes ?? null,
    });

    return this.promoCodesRepository.save(promoCode);
  }

  findAll(): Promise<PromoCode[]> {
    return this.promoCodesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<PromoCode> {
    const promoCode = await this.promoCodesRepository.findOne({
      where: { id },
    });
    if (!promoCode) {
      throw new NotFoundException(`Promo code "${id}" not found`);
    }
    return promoCode;
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promoCode = await this.findOne(id);
    if (dto.code) {
      dto.code = dto.code.toUpperCase();
    }
    Object.assign(promoCode, dto);
    if (dto.expiresAt) {
      promoCode.expiresAt = new Date(dto.expiresAt);
    }
    return this.promoCodesRepository.save(promoCode);
  }

  async remove(id: string): Promise<void> {
    const promoCode = await this.findOne(id);
    await this.promoCodesRepository.remove(promoCode);
  }

  async validate(
    dto: ValidatePromoCodeDto,
    userId: string,
  ): Promise<ValidatePromoCodeResponse> {
    const code = dto.code.toUpperCase();
    const promoCode = await this.promoCodesRepository.findOne({
      where: { code },
    });

    if (!promoCode) {
      return { valid: false, message: 'Invalid promo code' };
    }
    if (!promoCode.isActive) {
      return { valid: false, message: 'Promo code is inactive' };
    }
    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      return { valid: false, message: 'Promo code has expired' };
    }
    if (
      promoCode.maxUses !== null &&
      promoCode.usedCount >= promoCode.maxUses
    ) {
      return { valid: false, message: 'Promo code usage limit reached' };
    }
    if (dto.bookingAmount < promoCode.minBookingAmount) {
      return {
        valid: false,
        message: `Minimum booking amount is ₦${(promoCode.minBookingAmount / 100).toFixed(2)}`,
      };
    }

    if (
      promoCode.applicableWorkspaceTypes &&
      promoCode.applicableWorkspaceTypes.length > 0
    ) {
      const workspace = await this.workspacesRepository.findOne({
        where: { id: dto.workspaceId },
      });
      if (!workspace) {
        return { valid: false, message: 'Workspace not found' };
      }
      if (!promoCode.applicableWorkspaceTypes.includes(workspace.type)) {
        return {
          valid: false,
          message: 'Promo code is not applicable to this workspace type',
        };
      }
    }

    const alreadyUsed = await this.usagesRepository.findOne({
      where: { promoCodeId: promoCode.id, userId },
    });
    if (alreadyUsed) {
      return {
        valid: false,
        message: 'You have already used this promo code',
      };
    }

    const discount =
      promoCode.discountType === DiscountType.PERCENTAGE
        ? Math.floor((dto.bookingAmount * promoCode.discountValue) / 100)
        : promoCode.discountValue;

    const finalAmount = Math.max(0, dto.bookingAmount - discount);

    return {
      valid: true,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      finalAmount,
      message: 'Promo code applied successfully',
    };
  }

  async recordUsage(
    promoCodeId: string,
    userId: string,
    bookingId: string,
    discountApplied: number,
  ): Promise<void> {
    const alreadyRecorded = await this.usagesRepository.findOne({
      where: { promoCodeId, userId },
    });
    if (alreadyRecorded) return;

    await this.dataSource.transaction(async (manager) => {
      const usage = manager.create(PromoCodeUsage, {
        promoCodeId,
        userId,
        bookingId,
        discountApplied,
      });
      await manager.save(usage);
      await manager.increment(PromoCode, { id: promoCodeId }, 'usedCount', 1);
    });
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promoCodesRepository.findOne({
      where: { code: code.toUpperCase() },
    });
  }
}
