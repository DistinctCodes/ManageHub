'use client';

import React from 'react';
import Link from 'next/link';

export default function PublicBookingSuccessScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-5 animate-scale-in">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Booking Confirmed!</h1>
          <p className="text-sm text-slate-500">
            Thank you for booking a pass. Your access credential barcode and digital pass receipt have been sent straight to your email address.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/book"
            className="inline-flex justify-center w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
          >
            Book Another Day Pass
          </Link>
        </div>
      </div>
    </div>
  );
}