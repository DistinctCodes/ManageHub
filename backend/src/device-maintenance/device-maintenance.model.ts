export type MaintenanceStatus =
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'overdue';
export type DeviceType =
  | 'router'
  | 'projector'
  | 'printer'
  | 'server'
  | 'switch'
  | 'computer'
  | 'other';
export type MaintenanceType = 'preventive' | 'corrective' | 'emergency';

export interface Device {
  id: string;
  name: string;
  deviceType: DeviceType;
  location: string;
  serialNumber?: string;
  model?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceIntervalDays: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecord {
  id: string;
  deviceId: string;
  device?: Device;
  title: string;
  description: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  technician: string;
  cost?: number;
  notes?: string;
  parts?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceSchedule {
  deviceId: string;
  deviceName: string;
  nextMaintenanceDate: Date;
  daysSinceLastMaintenance: number;
  isOverdue: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}
