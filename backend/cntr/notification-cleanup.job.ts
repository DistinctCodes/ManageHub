export interface Notification {
  id: string;
  isRead: boolean;
  createdAt: Date;
}

export function identifyExpiredNotifications(
  notifications: Notification[],
  retentionDays = 30,
  now: Date = new Date(),
): Notification[] {
  return notifications.filter((n) => {
    if (!n.isRead) return false;
    const ageDays = (now.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > retentionDays;
  });
}
