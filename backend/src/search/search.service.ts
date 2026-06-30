import { Injectable } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BookingsService } from '../bookings/bookings.service';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/providers/users.service';
import { UserRole } from '../users/enums/userRoles.enum';

@Injectable()
export class SearchService {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly bookingsService: BookingsService,
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  async search(query: string, types: string, user: any) {
    const typesArr = types ? types.split(',') : ['workspaces', 'bookings', 'events', 'members'];
    const results = [];

    if (typesArr.includes('workspaces')) {
      const { data: workspaces } = await this.workspacesService.findAll({ search: query, limit: 5 });
      workspaces.forEach((workspace) => {
        results.push({
          type: 'workspaces',
          id: workspace.id,
          title: workspace.name,
          subtitle: workspace.type,
          href: `/workspaces/${workspace.id}`,
        });
      });
    }

    if (typesArr.includes('bookings')) {
      // Assuming no direct search, so filtering after fetching
      const { data: bookings } = await this.bookingsService.findAll({ limit: 100 }, user.id, user.role);
      const filteredBookings = bookings
        .filter(
          (booking) =>
            booking.workspace?.name.toLowerCase().includes(query.toLowerCase()) ||
            booking.id.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 5);

      filteredBookings.forEach((booking) => {
        results.push({
          type: 'bookings',
          id: booking.id,
          title: booking.workspace?.name || `Booking #${booking.id.slice(0, 8)}`,
          subtitle: `${booking.status} · ${new Date(booking.startDate).toLocaleDateString()}`,
          href: `/bookings/${booking.id}`,
        });
      });
    }

    if (typesArr.includes('events')) {
        // Assuming no direct search, so filtering after fetching
        const { data: events } = await this.eventsService.findAll(1, 100);
        const filteredEvents = events
            .filter((event) => event.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);

        filteredEvents.forEach((event) => {
            results.push({
                type: 'events',
                id: event.id,
                title: event.title,
                subtitle: new Date(event.date).toLocaleDateString(),
                href: `/events/${event.id}`,
            });
        });
    }

    if (typesArr.includes('members') && user.role === UserRole.ADMIN) {
        const { data: members } = await this.usersService.getMembers({ search: query, limit: 5 });
        members.forEach((member) => {
            results.push({
                type: 'members',
                id: member.id,
                title: `${member.firstName} ${member.lastName}`,
                subtitle: member.email,
                href: `/admin/members/${member.id}`,
            });
        });
    }

    return { results };
  }
}