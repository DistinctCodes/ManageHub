export interface WorkspaceLog {
  id: string;
  userId: string;
  workspaceId: string;
  bookingId?: string;
  checkedInAt: string;
  checkedOutAt?: string;
  durationMinutes?: number;
  notes?: string;
  workspace?: { id: string; name: string; type: string };
}
