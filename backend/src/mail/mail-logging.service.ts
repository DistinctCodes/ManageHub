import { Injectable } from '@nestjs/common';

export interface MailEntry {
  id: string;
  memberId: string;
  packageName: string;
  status: 'received' | 'notified' | 'picked-up';
  receivedAt: Date;
  recipient?: string;
}

@Injectable()
export class MailLoggingService {
  private mailLog: MailEntry[] = [];

  logMailReceived(
    memberId: string,
    packageName: string,
    recipient: string
  ): MailEntry {
    const entry: MailEntry = {
      id: Date.now().toString(),
      memberId,
      packageName,
      status: 'received',
      receivedAt: new Date(),
      recipient,
    };
    this.mailLog.push(entry);
    this.notifyMember(memberId, packageName);
    return entry;
  }

  private notifyMember(memberId: string, packageName: string): void {
    console.log(`Notifying member ${memberId} about ${packageName}`);
  }

  confirmPickup(mailId: string): MailEntry | null {
    const mail = this.mailLog.find(m => m.id === mailId);
    if (mail) {
      mail.status = 'picked-up';
    }
    return mail || null;
  }

  getMemberMail(memberId: string): MailEntry[] {
    return this.mailLog.filter(m => m.memberId === memberId);
  }
}
