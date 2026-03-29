export type WorkspaceType =
  | "PRIVATE_OFFICE"
  | "COWORKING"
  | "MEETING_ROOM"
  | "HOT_DESK"
  | "DEDICATED_DESK";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  totalSeats: number;
  availableSeats: number;
  hourlyRate: number; // in kobo
  description?: string;
  amenities?: string[];
  images?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceAvailability {
  workspaceId: string;
  requestedSeats: number;
  available: boolean;
  totalSeats: number;
  availableSeats: number;
  message: string;
}

export interface WorkspaceQuery {
  page?: number;
  limit?: number;
  type?: WorkspaceType;
  minSeats?: number;
  search?: string;
}
