import { Injectable } from '@nestjs/common';

export interface MaintenanceTicket {
  id: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

@Injectable()
export class MaintenanceService {
  private tickets: MaintenanceTicket[] = [];

  createTicket(description: string, priority: string): MaintenanceTicket {
    const ticket: MaintenanceTicket = {
      id: Date.now().toString(),
      description,
      status: 'open',
      priority: priority as any,
      createdAt: new Date(),
    };
    this.tickets.push(ticket);
    return ticket;
  }

  getTickets(): MaintenanceTicket[] {
    return this.tickets;
  }

  updateTicketStatus(
    id: string,
    status: 'open' | 'in-progress' | 'resolved'
  ): MaintenanceTicket | null {
    const ticket = this.tickets.find(t => t.id === id);
    if (ticket) {
      ticket.status = status;
    }
    return ticket || null;
  }

  triageTickets(): MaintenanceTicket[] {
    return this.tickets
      .filter(t => t.status === 'open')
      .sort(
        (a, b) =>
          ['high', 'medium', 'low'].indexOf(b.priority) -
          ['high', 'medium', 'low'].indexOf(a.priority)
      );
  }
}
