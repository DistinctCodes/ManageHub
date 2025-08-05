export interface CheckinRecord {
    userId: string;
    userName: string;
    email: string;
    department: string;
    checkInDate: string; // ISO date string
    checkInTime: string;
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    temperature: number;
    oxygenSaturation: number;
    weight: number;
    height: number;
    bmi: number;
    steps: number;
    sleepHours: number;
    stressLevel: number;
    healthStatus: string; // 'Good', 'Fair', 'Poor', 'Critical'
    notes: string;
  }
  
  export interface ExportResult {
    fileName: string;
    filePath: string;
    recordCount: number;
    exportDate: Date;
    fileSize: number; // in bytes
  }