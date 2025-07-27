// src/device-maintenance/device-maintenance.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Device,
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceStatus,
  DeviceType,
  MaintenanceType,
} from './device-maintenance.model';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/create-device.dto';
import {
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
} from './dto/create-maintenance.dto';

@Injectable()
export class DeviceMaintenanceService {
  private devices: Device[] = [
    {
      id: '1',
      name: 'Main Office Router',
      deviceType: 'router' as DeviceType,
      location: 'IT Room - Floor 1',
      serialNumber: 'RT-001-ABC',
      model: 'Cisco ISR4321',
      purchaseDate: new Date('2023-01-15'),
      warrantyExpiry: new Date('2026-01-15'),
      lastMaintenanceDate: new Date('2024-10-15'),
      nextMaintenanceDate: new Date('2025-01-15'),
      maintenanceIntervalDays: 90,
      isActive: true,
      notes: 'Primary network router for main office',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-10-15'),
    },
    {
      id: '2',
      name: 'Conference Room Projector',
      deviceType: 'projector' as DeviceType,
      location: 'Conference Room A',
      serialNumber: 'PJ-002-XYZ',
      model: 'Epson PowerLite 1985W',
      purchaseDate: new Date('2023-03-20'),
      warrantyExpiry: new Date('2025-03-20'),
      lastMaintenanceDate: new Date('2024-11-01'),
      nextMaintenanceDate: new Date('2025-02-01'),
      maintenanceIntervalDays: 90,
      isActive: true,
      notes: 'Main presentation projector',
      createdAt: new Date('2023-03-20'),
      updatedAt: new Date('2024-11-01'),
    },
  ];

  private maintenanceRecords: MaintenanceRecord[] = [
    {
      id: '1',
      deviceId: '1',
      title: 'Quarterly Router Maintenance',
      description: 'Firmware update, clean air filters, check connections',
      maintenanceType: 'preventive' as MaintenanceType,
      status: 'completed' as MaintenanceStatus,
      scheduledDate: new Date('2024-10-15'),
      startedAt: new Date('2024-10-15T09:00:00Z'),
      completedAt: new Date('2024-10-15T11:30:00Z'),
      technician: 'John Smith',
      cost: 120.0,
      notes: 'All systems operating normally after maintenance',
      parts: ['Air filter'],
      createdAt: new Date('2024-10-01'),
      updatedAt: new Date('2024-10-15'),
    },
    {
      id: '2',
      deviceId: '2',
      title: 'Projector Lamp Replacement',
      description: 'Replace projector lamp and clean lens',
      maintenanceType: 'preventive' as MaintenanceType,
      status: 'completed' as MaintenanceStatus,
      scheduledDate: new Date('2024-11-01'),
      startedAt: new Date('2024-11-01T14:00:00Z'),
      completedAt: new Date('2024-11-01T15:00:00Z'),
      technician: 'Sarah Johnson',
      cost: 280.0,
      notes: 'New lamp installed, brightness improved significantly',
      parts: ['Projector lamp', 'Lens cleaning kit'],
      createdAt: new Date('2024-10-20'),
      updatedAt: new Date('2024-11-01'),
    },
  ];

  // Device Management
  async createDevice(dto: CreateDeviceDto): Promise<Device> {
    const device: Device = {
      id: randomUUID(),
      name: dto.name,
      deviceType: dto.deviceType,
      location: dto.location,
      serialNumber: dto.serialNumber,
      model: dto.model,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyExpiry: dto.warrantyExpiry
        ? new Date(dto.warrantyExpiry)
        : undefined,
      maintenanceIntervalDays: dto.maintenanceIntervalDays,
      isActive: dto.isActive ?? true,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate next maintenance date
    device.nextMaintenanceDate = new Date();
    device.nextMaintenanceDate.setDate(
      device.nextMaintenanceDate.getDate() + device.maintenanceIntervalDays,
    );

    this.devices.push(device);
    return device;
  }

  async getAllDevices(): Promise<Device[]> {
    return this.devices.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDeviceById(id: string): Promise<Device> {
    const device = this.devices.find((d) => d.id === id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async updateDevice(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.getDeviceById(id);

    Object.assign(device, {
      ...dto,
      purchaseDate: dto.purchaseDate
        ? new Date(dto.purchaseDate)
        : device.purchaseDate,
      warrantyExpiry: dto.warrantyExpiry
        ? new Date(dto.warrantyExpiry)
        : device.warrantyExpiry,
      updatedAt: new Date(),
    });

    // Recalculate next maintenance date if interval changed
    if (dto.maintenanceIntervalDays && device.lastMaintenanceDate) {
      device.nextMaintenanceDate = new Date(device.lastMaintenanceDate);
      device.nextMaintenanceDate.setDate(
        device.nextMaintenanceDate.getDate() + dto.maintenanceIntervalDays,
      );
    }

    return device;
  }

  async deleteDevice(id: string): Promise<void> {
    const index = this.devices.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    this.devices.splice(index, 1);
  }

  // Maintenance Record Management
  async createMaintenanceRecord(
    dto: CreateMaintenanceDto,
  ): Promise<MaintenanceRecord> {
    await this.getDeviceById(dto.deviceId); // Validate device exists

    const record: MaintenanceRecord = {
      id: randomUUID(),
      deviceId: dto.deviceId,
      title: dto.title,
      description: dto.description,
      maintenanceType: dto.maintenanceType,
      status: 'scheduled' as MaintenanceStatus,
      scheduledDate: new Date(dto.scheduledDate),
      technician: dto.technician,
      cost: dto.cost,
      notes: dto.notes,
      parts: dto.parts,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.maintenanceRecords.push(record);
    return record;
  }

  async getAllMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    return this.maintenanceRecords
      .map((record) => ({
        ...record,
        device: this.devices.find((d) => d.id === record.deviceId),
      }))
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  async getMaintenanceRecordById(id: string): Promise<MaintenanceRecord> {
    const record = this.maintenanceRecords.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }
    return {
      ...record,
      device: this.devices.find((d) => d.id === record.deviceId),
    };
  }

  async getMaintenanceRecordsByDevice(
    deviceId: string,
  ): Promise<MaintenanceRecord[]> {
    await this.getDeviceById(deviceId); // Validate device exists

    return this.maintenanceRecords
      .filter((r) => r.deviceId === deviceId)
      .map((record) => ({
        ...record,
        device: this.devices.find((d) => d.id === record.deviceId),
      }))
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  async updateMaintenanceRecord(
    id: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceRecord> {
    const record = this.maintenanceRecords.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }

    Object.assign(record, {
      ...dto,
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : record.scheduledDate,
      updatedAt: new Date(),
    });

    return {
      ...record,
      device: this.devices.find((d) => d.id === record.deviceId),
    };
  }

  async startMaintenance(id: string): Promise<MaintenanceRecord> {
    const record = this.maintenanceRecords.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }

    if (record.status !== 'scheduled') {
      throw new BadRequestException('Can only start scheduled maintenance');
    }

    record.status = 'in-progress';
    record.startedAt = new Date();
    record.updatedAt = new Date();

    return {
      ...record,
      device: this.devices.find((d) => d.id === record.deviceId),
    };
  }

  async completeMaintenance(
    id: string,
    notes?: string,
  ): Promise<MaintenanceRecord> {
    const record = this.maintenanceRecords.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }

    if (record.status !== 'in-progress') {
      throw new BadRequestException(
        'Can only complete in-progress maintenance',
      );
    }

    record.status = 'completed';
    record.completedAt = new Date();
    record.updatedAt = new Date();
    if (notes) {
      record.notes = record.notes ? `${record.notes}\n${notes}` : notes;
    }

    // Update device's last maintenance date and calculate next maintenance
    const device = this.devices.find((d) => d.id === record.deviceId);
    if (device) {
      device.lastMaintenanceDate = record.completedAt;
      device.nextMaintenanceDate = new Date(record.completedAt);
      device.nextMaintenanceDate.setDate(
        device.nextMaintenanceDate.getDate() + device.maintenanceIntervalDays,
      );
      device.updatedAt = new Date();
    }

    return {
      ...record,
      device,
    };
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    const index = this.maintenanceRecords.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }
    this.maintenanceRecords.splice(index, 1);
  }

  // Scheduling and Analytics
  async getMaintenanceSchedule(): Promise<MaintenanceSchedule[]> {
    const now = new Date();

    return this.devices
      .filter((device) => device.isActive)
      .map((device) => {
        const daysSinceLastMaintenance = device.lastMaintenanceDate
          ? Math.floor(
              (now.getTime() - device.lastMaintenanceDate.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : device.maintenanceIntervalDays + 1;

        const nextMaintenanceDate =
          device.nextMaintenanceDate ||
          new Date(
            now.getTime() +
              device.maintenanceIntervalDays * 24 * 60 * 60 * 1000,
          );
        const isOverdue = nextMaintenanceDate < now;

        let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (isOverdue) {
          const daysOverdue = Math.floor(
            (now.getTime() - nextMaintenanceDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          if (daysOverdue > 30) urgencyLevel = 'critical';
          else if (daysOverdue > 14) urgencyLevel = 'high';
          else urgencyLevel = 'medium';
        } else {
          const daysUntilMaintenance = Math.floor(
            (nextMaintenanceDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          if (daysUntilMaintenance <= 7) urgencyLevel = 'high';
          else if (daysUntilMaintenance <= 14) urgencyLevel = 'medium';
        }

        return {
          deviceId: device.id,
          deviceName: device.name,
          nextMaintenanceDate,
          daysSinceLastMaintenance,
          isOverdue,
          urgencyLevel,
        };
      })
      .sort((a, b) => {
        // Sort by urgency first, then by date
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const urgencyDiff =
          urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
        if (urgencyDiff !== 0) return urgencyDiff;
        return (
          a.nextMaintenanceDate.getTime() - b.nextMaintenanceDate.getTime()
        );
      });
  }

  async getOverdueDevices(): Promise<MaintenanceSchedule[]> {
    const schedule = await this.getMaintenanceSchedule();
    return schedule.filter((item) => item.isOverdue);
  }

  async getUpcomingMaintenance(
    days: number = 30,
  ): Promise<MaintenanceRecord[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.maintenanceRecords
      .filter(
        (record) =>
          record.status === 'scheduled' &&
          record.scheduledDate >= now &&
          record.scheduledDate <= futureDate,
      )
      .map((record) => ({
        ...record,
        device: this.devices.find((d) => d.id === record.deviceId),
      }))
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async getMaintenanceStats(): Promise<{
    totalDevices: number;
    activeDevices: number;
    overdueDevices: number;
    scheduledMaintenance: number;
    inProgressMaintenance: number;
    completedMaintenanceThisMonth: number;
    totalMaintenanceCost: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const schedule = await this.getMaintenanceSchedule();

    return {
      totalDevices: this.devices.length,
      activeDevices: this.devices.filter((d) => d.isActive).length,
      overdueDevices: schedule.filter((s) => s.isOverdue).length,
      scheduledMaintenance: this.maintenanceRecords.filter(
        (r) => r.status === 'scheduled',
      ).length,
      inProgressMaintenance: this.maintenanceRecords.filter(
        (r) => r.status === 'in-progress',
      ).length,
      completedMaintenanceThisMonth: this.maintenanceRecords.filter(
        (r) =>
          r.status === 'completed' &&
          r.completedAt &&
          r.completedAt >= startOfMonth,
      ).length,
      totalMaintenanceCost: this.maintenanceRecords
        .filter((r) => r.status === 'completed' && r.cost)
        .reduce((sum, r) => sum + (r.cost || 0), 0),
    };
  }
}
