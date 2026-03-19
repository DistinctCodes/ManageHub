export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  location?: string;
  seatsAvailable: number;
  seatsBooked: number;
  amenities?: string[];
  images?: string[];
  hourlyRate?: number;
  dailyRate?: number;
  monthlyRate?: number;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
