export class EnergySummaryDto {
  workspaceId: string;
  workspaceName: string;
  totalConsumption: number;
  averageDailyConsumption: number;
  daysTracked: number;
  lastRecordedDate: Date;
  peakConsumptionDay: {
    date: Date;
    consumption: number;
  };
  lowestConsumptionDay: {
    date: Date;
    consumption: number;
  };
}