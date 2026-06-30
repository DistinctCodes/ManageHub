'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAttendanceSummary } from '@/lib/react-query/hooks/workspace-tracking/useAttendanceSummary';
import { useAttendanceHistory } from '@/lib/react-query/hooks/workspace-tracking/useAttendanceHistory';
import MonthlyActivityChart from '@/components/attendance/MonthlyActivityChart';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';
import { apiClient } from '@/lib/apiClient';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

export default function AttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const [from, setFrom] = useState<Date | undefined>(
    searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  );
  const [to, setTo] = useState<Date | undefined>(
    searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
  );

  const { data: summaryData, isLoading: summaryIsLoading } = useAttendanceSummary();
  const { data: historyData, isLoading: historyIsLoading } = useAttendanceHistory({
    page,
    limit,
    from: from?.toISOString(),
    to: to?.toISOString(),
  });

  const handleDateChange = () => {
    const params = new URLSearchParams(searchParams);
    if (from) {
      params.set('from', from.toISOString());
    } else {
      params.delete('from');
    }
    if (to) {
      params.set('to', to.toISOString());
    } else {
      params.delete('to');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/workspace-tracking/history?format=csv', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `attendance-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (error) {
      console.error('Failed to export CSV', error);
    }
  };

  const records = historyData?.data.records ?? [];
  const totalPages = historyData?.data.totalPages ?? 1;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryIsLoading ? (
          <p>Loading summary...</p>
        ) : (
          <>
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Hours This Month</h3>
              <p className="text-2xl font-bold">{summaryData?.data.totalHoursThisMonth ?? 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Days Visited This Month</h3>
              <p className="text-2xl font-bold">{summaryData?.data.daysVisitedThisMonth ?? 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Current Streak</h3>
              <p className="text-2xl font-bold">{summaryData?.data.currentStreak ?? 0} days</p>
            </div>
          </>
        )}
      </div>

      {/* Monthly Chart */}
      <MonthlyActivityChart data={records} />

      {/* History Table */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold">History</h3>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker date={from} setDate={setFrom} />
            <DatePicker date={to} setTo={setTo} />
            <Button onClick={handleDateChange}>Filter</Button>
            <Button variant="outline" onClick={handleExport}>Export</Button>
          </div>
        </div>
        {historyIsLoading ? (
          <p>Loading history...</p>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <Image src="/window.svg" alt="No check-ins yet" width={150} height={150} className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No check-ins yet</h3>
            <p className="text-muted-foreground mb-4">Book a workspace to get started.</p>
            <Button asChild>
              <a href="/workspaces">Browse Workspaces</a>
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.checkInTime), 'PPP')}</TableCell>
                    <TableCell>{record.workspaceName}</TableCell>
                    <TableCell>{format(new Date(record.checkInTime), 'p')}</TableCell>
                    <TableCell>{format(new Date(record.checkOutTime), 'p')}</TableCell>
                    <TableCell>{(record.duration / 3600).toFixed(2)} hours</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}