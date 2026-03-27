"use client";

import { useState } from "react";
import DashboardLayout from "@/app/(dashboard)/layout";
import { useGetAllBookings } from "@/lib/hooks/useGetAllBookings"; // from Issue #22
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type Status = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<Status>("ALL");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "cancel" | "complete" | null;
    bookingId: string | null;
  }>({ open: false, action: null, bookingId: null });

  const { bookings, counts, loading, error, mutateBooking, pagination } = useGetAllBookings(statusFilter);

  const handleAction = async (id: string, action: "cancel" | "complete" | "confirm") => {
    try {
      await mutateBooking(id, action);
      toast.success(`Booking ${action}ed successfully`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} booking`);
    } finally {
      setConfirmDialog({ open: false, action: null, bookingId: null });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Bookings Management</h1>

        {/* Status filter tabs */}
        <div className="flex gap-4">
          {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as Status[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {status}
              <Badge className="ml-2">{counts[status.toLowerCase()] ?? 0}</Badge>
            </Button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && <p className="text-red-600">Failed to load bookings.</p>}

        {/* Empty state */}
        {!loading && bookings.length === 0 && <p>No bookings found.</p>}

        {/* Table */}
        {!loading && bookings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Workspace</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell>Total (₦)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.memberName}</TableCell>
                  <TableCell>{b.workspaceName}</TableCell>
                  <TableCell>{b.planType}</TableCell>
                  <TableCell>{b.startDate} - {b.endDate}</TableCell>
                  <TableCell>{b.seats}</TableCell>
                  <TableCell>₦{b.totalAmount}</TableCell>
                  <TableCell>
                    <Badge>{b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button onClick={() => handleAction(b.id, "confirm")}>Confirm</Button>
                        <Button
                          variant="destructive"
                          onClick={() => setConfirmDialog({ open: true, action: "cancel", bookingId: b.id })}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {b.status === "CONFIRMED" && (
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => setConfirmDialog({ open: true, action: "complete", bookingId: b.id })}
                        >
                          Complete
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setConfirmDialog({ open: true, action: "cancel", bookingId: b.id })}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-end gap-2 mt-4">
            <Button disabled={pagination.page === 1} onClick={pagination.prev}>Previous</Button>
            <Button disabled={pagination.page === pagination.totalPages} onClick={pagination.next}>Next</Button>
          </div>
        )}

        {/* Confirmation dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
            </DialogHeader>
            <p>
              Are you sure you want to {confirmDialog.action} this booking? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: null, bookingId: null })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmDialog.bookingId && confirmDialog.action && handleAction(confirmDialog.bookingId, confirmDialog.action)}
              >
                Yes, {confirmDialog.action}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
