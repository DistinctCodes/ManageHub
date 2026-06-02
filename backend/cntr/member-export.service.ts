import { Parser } from 'json2csv';

export interface MemberExportRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  joinedDate: string;
  totalBookings: number;
}

const FIELDS = [
  { label: 'ID', value: 'id' },
  { label: 'Email', value: 'email' },
  { label: 'Full Name', value: 'fullName' },
  { label: 'Role', value: 'role' },
  { label: 'Status', value: 'status' },
  { label: 'Joined Date', value: 'joinedDate' },
  { label: 'Total Bookings', value: 'totalBookings' },
];

export function exportMembersToCSV(members: MemberExportRow[]): string {
  const parser = new Parser({ fields: FIELDS });
  return parser.parse(members);
}
