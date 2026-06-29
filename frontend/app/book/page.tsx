'use client';

import React, { useState, useEffect } from 'react';

interface Workspace {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  imageUrl?: string;
}

export default function PublicDayPassBookingWizard() {
  const [step, setStep] = useState<number>(1);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Form State Values
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [userDetails, setUserDetails] = useState({ fullName: '', email: '', phone: '' });

  useEffect(() => {
    // Fetch day-pass eligible spaces exposed by the public endpoint matrix
    fetch('/api/v1/bookings/public/eligible-workspaces')
      .then((res) => res.json())
      .then((json) => setWorkspaces(json.data || []))
      .catch((err) => console.error('Error listing public workspaces:', err));
  }, []);

  const handlePayNow = async () => {
    if (!selectedWorkspace || !bookingDate) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/bookings/public/day-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspace.id,
          date: bookingDate,
          ...userDetails,
        }),
      });

      const json = await res.json();
      if (json.authorizationUrl) {
        // Hand off checkout orchestration directly to Paystack payment gateway routing paths
        window.location.href = json.authorizationUrl;
      } else {
        alert('Failed to initialize payment gateway checkout channel.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error dispatching public day-pass order request:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-3xl w-full mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-8">
        
        {/* Step Indicator Header Navigation Map */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight">Book a Day Pass</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span className={step === 1 ? 'text-blue-600 font-bold' : ''}>1. Space</span>
            <span>&rarr;</span>
            <span className={step === 2 ? 'text-blue-600 font-bold' : ''}>2. Details</span>
            <span>&rarr;</span>
            <span className={step === 3 ? 'text-blue-600 font-bold' : ''}>3. Checkout</span>
          </div>
        </div>

        {/* STEP 1: WORKSPACE SELECTION CARD SECTORS */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Choose Your Hot Desk or Space & Target Execution Date</h2>
            <div className="grid gap-3">
              <label className="block text-xs font-bold text-slate-500 uppercase">Target Visit Date</label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="max-w-xs border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((space) => (
                <div
                  key={space.id}
                  onClick={() => setSelectedWorkspace(space)}
                  className={`cursor-pointer border p-5 rounded-xl transition-all flex flex-col justify-between ${
                    selectedWorkspace?.id === space.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-md text-slate-900">{space.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{space.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Daily Pass rate</span>
                    <span className="font-bold text-blue-600 text-sm">{space.pricePerDay} NGN</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                disabled={!selectedWorkspace || !bookingDate}
                onClick={() => setStep(2)}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Continue to Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: USER METADATA IDENTIFICATION INPUT CHANNELS */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Enter Your Contact Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  placeholder="John Doe"
                  value={userDetails.fullName}
                  onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  placeholder="johndoe@example.com"
                  value={userDetails.email}
                  onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  placeholder="+234 801 234 5678"
                  value={userDetails.phone}
                  onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(1)}
                className="text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Back
              </button>
              <button
                disabled={!userDetails.fullName || !userDetails.email || !userDetails.phone}
                onClick={() => setStep(3)}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                Review Summary
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY VERIFICATION & PAYSTACK CHECKOUT REDIRECTS */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Review Your Day Pass Booking Summary</h2>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Selected Space:</span><span className="font-semibold">{selectedWorkspace?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Scheduled Visit Date:</span><span className="font-mono font-semibold">{bookingDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Pass Holder:</span><span className="font-semibold">{userDetails.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Contact Email:</span><span className="font-semibold">{userDetails.email}</span></div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-md font-bold">
                <span>Total Due Amount:</span>
                <span className="text-blue-600 text-lg">{selectedWorkspace?.pricePerDay} NGN</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Back
              </button>
              <button
                disabled={loading}
                onClick={handlePayNow}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-md transition-colors"
              >
                {loading ? 'Redirecting to Gateway...' : 'Pay with Paystack'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}