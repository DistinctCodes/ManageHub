export class CreateMonitoringDto {
  userId: number;
  type: 'staff' | 'user';
  action: 'check-in' | 'check-out';
  deviceUsed: string;
  workspaceId: number;
}
