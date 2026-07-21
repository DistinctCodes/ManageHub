"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BookingForm from "@/components/bookings/BookingForm";

export default function NewBookingPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Choose your plan, dates and confirm payment.
        </p>
      </div>
      <Suspense fallback={<div className="bg-white rounded-xl border border-gray-100 h-96 animate-pulse" />}>
        <BookingForm />
      </Suspense>
    </DashboardLayout>
  );
}
