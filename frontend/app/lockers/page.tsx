"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetMyLocker } from "@/lib/react-query/hooks/lockers/useGetMyLocker";
import { Lock, LockOpen } from "lucide-react";

export default function LockersPage() {
  const { data, isLoading } = useGetMyLocker();
  const locker = (data as any)?.data;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Locker</h1>
        <p className="text-gray-500 text-sm mt-1">View your assigned locker details.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : locker ? (
        <div className="max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Your Locker</p>
          <p className="text-6xl font-black text-gray-900 mb-4">{locker.lockerNumber}</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-400">Floor</span>
              <span className="font-medium">{locker.floor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Size</span>
              <span className="font-medium">{locker.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Assigned</span>
              <span className="font-medium">
                {locker.assignedAt ? new Date(locker.assignedAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LockOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-2">No locker assigned</p>
          <p className="text-sm text-gray-500 mb-6">
            You don&apos;t have a locker yet. Request one from the admin.
          </p>
          <button
            className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            onClick={() => alert("Request sent to admin!")}
          >
            Request a Locker
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
