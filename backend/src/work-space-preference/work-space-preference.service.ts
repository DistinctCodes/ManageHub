import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PreferenceType,
  WorkspacePreference,
} from './entities/work-space-preference.entity';
import { CreateWorkspacePreferenceDto } from './dto/create-work-space-preference.dto';
import { WorkspacePreferenceQueryDto } from './dto/work-space-preference-query.dto';
import { UpdateWorkspacePreferenceDto } from './dto/update-work-space-preference.dto';
@Injectable()
export class WorkspacePreferencesService {
  constructor(
    @InjectRepository(WorkspacePreference)
    private readonly preferenceRepository: Repository<WorkspacePreference>,
  ) {}

  async create(
    createDto: CreateWorkspacePreferenceDto,
  ): Promise<WorkspacePreference> {
    // Check if preference already exists for this user and type
    const existing = await this.preferenceRepository.findOne({
      where: {
        userId: createDto.userId,
        preferenceType: createDto.preferenceType,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Preference ${createDto.preferenceType} already exists for user ${createDto.userId}`,
      );
    }

    const preference = this.preferenceRepository.create(createDto);
    return await this.preferenceRepository.save(preference);
  }

  async findAll(
    query?: WorkspacePreferenceQueryDto,
  ): Promise<WorkspacePreference[]> {
    const queryBuilder =
      this.preferenceRepository.createQueryBuilder('preference');

    if (query?.userId) {
      queryBuilder.andWhere('preference.userId = :userId', {
        userId: query.userId,
      });
    }

    if (query?.preferenceType) {
      queryBuilder.andWhere('preference.preferenceType = :preferenceType', {
        preferenceType: query.preferenceType,
      });
    }

    if (query?.isActive !== undefined) {
      queryBuilder.andWhere('preference.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    queryBuilder.orderBy('preference.updatedAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async findByUserId(userId: string): Promise<WorkspacePreference[]> {
    return await this.preferenceRepository.find({
      where: { userId, isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findUserPreference(
    userId: string,
    preferenceType: PreferenceType,
  ): Promise<WorkspacePreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId, preferenceType },
    });

    if (!preference) {
      throw new NotFoundException(
        `Preference ${preferenceType} not found for user ${userId}`,
      );
    }

    return preference;
  }

  async findOne(id: string): Promise<WorkspacePreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { id },
    });

    if (!preference) {
      throw new NotFoundException(
        `Workspace preference with ID ${id} not found`,
      );
    }

    return preference;
  }

  async update(
    id: string,
    updateDto: UpdateWorkspacePreferenceDto,
  ): Promise<WorkspacePreference> {
    const preference = await this.findOne(id);

    Object.assign(preference, updateDto);
    return await this.preferenceRepository.save(preference);
  }

  async updateUserPreference(
    userId: string,
    preferenceType: PreferenceType,
    updateDto: UpdateWorkspacePreferenceDto,
  ): Promise<WorkspacePreference> {
    const preference = await this.findUserPreference(userId, preferenceType);

    Object.assign(preference, updateDto);
    return await this.preferenceRepository.save(preference);
  }

  async upsertUserPreference(
    userId: string,
    preferenceType: PreferenceType,
    value: any,
    options?: { unit?: string; description?: string; isActive?: boolean },
  ): Promise<WorkspacePreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { userId, preferenceType },
    });

    if (preference) {
      preference.value = value;
      if (options?.unit !== undefined) preference.unit = options.unit;
      if (options?.description !== undefined)
        preference.description = options.description;
      if (options?.isActive !== undefined)
        preference.isActive = options.isActive;
    } else {
      preference = this.preferenceRepository.create({
        userId,
        preferenceType,
        value,
        unit: options?.unit,
        description: options?.description,
        isActive: options?.isActive ?? true,
      });
    }

    return await this.preferenceRepository.save(preference);
  }

  async remove(id: string): Promise<void> {
    const preference = await this.findOne(id);
    await this.preferenceRepository.remove(preference);
  }

  async removeUserPreference(
    userId: string,
    preferenceType: PreferenceType,
  ): Promise<void> {
    const preference = await this.findUserPreference(userId, preferenceType);
    await this.preferenceRepository.remove(preference);
  }

  async getUserPreferencesProfile(
    userId: string,
  ): Promise<Record<string, any>> {
    const preferences = await this.findByUserId(userId);

    return preferences.reduce((profile, pref) => {
      profile[pref.preferenceType] = {
        value: pref.value,
        unit: pref.unit,
        description: pref.description,
        updatedAt: pref.updatedAt,
      };
      return profile;
    }, {});
  }

  async bulkUpdateUserPreferences(
    userId: string,
    preferences: Array<{
      preferenceType: PreferenceType;
      value: any;
      unit?: string;
      description?: string;
    }>,
  ): Promise<WorkspacePreference[]> {
    const results = [];

    for (const pref of preferences) {
      const result = await this.upsertUserPreference(
        userId,
        pref.preferenceType,
        pref.value,
        {
          unit: pref.unit,
          description: pref.description,
        },
      );
      results.push(result);
    }

    return results;
  }
}
