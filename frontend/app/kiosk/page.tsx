'use client';

import React, { useState, useEffect } from 'react';
import {
  useGetTodayVisitors,
  useSearchMembers,
  useVisitorCheckIn,
  useCreateAndCheckInWalkIn,
  useVisitorCheckOut,
  Visitor,
  Member,
} from '@/lib/react-query/hooks/visitors/useVisitorCheckIn';
import { Loader2, CheckCircle2, UserCheck, UserPlus, LogOut, Search, User } from 'lucide-react';

type KioskMode = 'HOME' | 'EXPECTED' | 'WALKIN' | 'CHECKOUT' | 'SUCCESS';

export default function KioskPage() {
  const [mode, setMode] = useState<KioskMode>('HOME');

  // Success screen state
  const [successDetails, setSuccessDetails] = useState<{ visitorName: string; hostName: string; action: 'IN' | 'OUT' } | null>(null);

  // Search/Filter states
  const [expectedQuery, setExpectedQuery] = useState('');
  const [checkoutQuery, setCheckoutQuery] = useState('');

  // Walk-in form states
  const [walkInName, setWalkInName] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [purpose, setPurpose] = useState('Meeting');

  // React Query API hooks
  const { data: todayVisitors = [], isLoading: loadingVisitors } = useGetTodayVisitors();
  const { data: memberResults = [], isLoading: loadingMembers } = useSearchMembers(memberSearchQuery);

  const checkInMutation = useVisitorCheckIn();
  const walkInMutation = useCreateAndCheckInWalkIn();
  const checkOutMutation = useVisitorCheckOut();

  // Auto-reset timer for success screen (8 seconds)
  useEffect(() => {
    if (mode === 'SUCCESS') {
      const timer = setTimeout(() => {
        resetToHome();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const resetToHome = () => {
    setMode('HOME');
    setSuccessDetails(null);
    setExpectedQuery('');
    setCheckoutQuery('');
    setWalkInName('');
    setMemberSearchQuery('');
    setSelectedMember(null);
    setPurpose('Meeting');
  };

  const handleExpectedCheckIn = (visitor: Visitor) => {
    checkInMutation.mutate(visitor.id, {
      onSuccess: () => {
        setSuccessDetails({
          visitorName: visitor.fullName,
          hostName: visitor.hostName,
          action: 'IN',
        });
        setMode('SUCCESS');
      },
    });
  };

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName || !selectedMember) return;

    walkInMutation.mutate(
      {
        fullName: walkInName,
        hostId: selectedMember.id,
        purpose,
      },
      {
        onSuccess: () => {
          setSuccessDetails({
            visitorName: walkInName,
            hostName: selectedMember.name,
            action: 'IN',
          });
          setMode('SUCCESS');
        },
      }
    );
  };

  const handleCheckOut = (visitor: Visitor) => {
    checkOutMutation.mutate(visitor.id, {
      onSuccess: () => {
        setSuccessDetails({
          visitorName: visitor.fullName,
          hostName: visitor.hostName,
          action: 'OUT',
        });
        setMode('SUCCESS');
      },
    });
  };

  // Filter expected visitors (status = PENDING)
  const filteredExpected = todayVisitors.filter(
    (v) =>
      v.status === 'PENDING' &&
      v.fullName.toLowerCase().includes(expectedQuery.toLowerCase())
  );

  // Filter checked-in visitors (status = CHECKED_IN)
  const filteredCheckedIn = todayVisitors.filter(
    (v) =>
      v.status === 'CHECKED_IN' &&
      v.fullName.toLowerCase().includes(checkoutQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* SUCCESS SCREEN */}
      {mode === 'SUCCESS' && successDetails && (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 animate-in fade-in zoom-in duration-300">
          <div className="rounded-full bg-green-100 p-6 text-green-600">
            <CheckCircle2 className="h-28 w-28" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-gray-900">
              {successDetails.action === 'IN'
                ? `Welcome, ${successDetails.visitorName}!`
                : `Goodbye, ${successDetails.visitorName}!`}
            </h1>
            <p className="text-2xl text-gray-600 font-medium">
              {successDetails.action === 'IN'
                ? `${successDetails.hostName} has been notified of your arrival.`
                : 'You have been checked out successfully.'}
            </p>
          </div>
          <button
            onClick={resetToHome}
            className="mt-8 px-10 py-5 bg-gray-900 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-transform"
          >
            Done
          </button>
        </div>
      )}

      {/* HOME MODE */}
      {mode === 'HOME' && (
        <div className="space-y-10 text-center">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900">Welcome to the Hub</h1>
            <p className="text-xl text-gray-500 mt-2">Please select an option to sign in or out</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => setMode('EXPECTED')}
              className="flex flex-col items-center justify-center p-10 bg-blue-50 border-2 border-blue-200 rounded-3xl hover:border-blue-500 active:scale-95 transition-all space-y-4"
            >
              <div className="p-5 bg-blue-600 text-white rounded-2xl shadow-md">
                <UserCheck className="h-12 w-12" />
              </div>
              <span className="text-2xl font-bold text-gray-900">I'm an Expected Visitor</span>
              <span className="text-sm text-gray-500">I have a pre-registered invitation</span>
            </button>

            <button
              onClick={() => setMode('WALKIN')}
              className="flex flex-col items-center justify-center p-10 bg-gray-50 border-2 border-gray-200 rounded-3xl hover:border-gray-400 active:scale-95 transition-all space-y-4"
            >
              <div className="p-5 bg-gray-900 text-white rounded-2xl shadow-md">
                <UserPlus className="h-12 w-12" />
              </div>
              <span className="text-2xl font-bold text-gray-900">I'm a Walk-in Visitor</span>
              <span className="text-sm text-gray-500">Register and notify host member</span>
            </button>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button
              onClick={() => setMode('CHECKOUT')}
              className="px-8 py-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 mx-auto hover:bg-red-100 active:scale-95 transition-all"
            >
              <LogOut className="h-6 w-6" /> Check Out
            </button>
          </div>
        </div>
      )}

      {/* EXPECTED VISITOR FLOW */}
      {mode === 'EXPECTED' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Find Your Sign-in</h2>
            <button
              onClick={resetToHome}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold active:scale-95"
            >
              Back
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
            <input
              type="text"
              placeholder="Enter your name..."
              value={expectedQuery}
              onChange={(e) => setExpectedQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 rounded-2xl border-2 border-gray-300 text-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          {loadingVisitors ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredExpected.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-lg">No pre-registered visitors found.</p>
              ) : (
                filteredExpected.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-200"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{v.fullName}</h3>
                      <p className="text-base text-gray-500">
                        Host: <span className="font-semibold text-gray-700">{v.hostName}</span> • Purpose:{' '}
                        <span className="font-semibold text-gray-700">{v.purpose}</span>
                      </p>
                    </div>
                    <button
                      disabled={checkInMutation.isPending}
                      onClick={() => handleExpectedCheckIn(v)}
                      className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                    >
                      {checkInMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Check In'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* WALK-IN FLOW */}
      {mode === 'WALKIN' && (
        <form onSubmit={handleWalkInSubmit} className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Walk-in Sign-in</h2>
            <button
              type="button"
              onClick={resetToHome}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold active:scale-95"
            >
              Back
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-lg font-bold text-gray-700 mb-2">Your Full Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Jane Doe"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-300 text-xl focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Member Typeahead Search */}
            <div className="relative">
              <label className="block text-lg font-bold text-gray-700 mb-2">Host Member</label>
              <input
                type="text"
                placeholder="Search member by name..."
                value={selectedMember ? selectedMember.name : memberSearchQuery}
                onChange={(e) => {
                  setSelectedMember(null);
                  setMemberSearchQuery(e.target.value);
                }}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-300 text-xl focus:border-blue-600 focus:outline-none"
              />

              {loadingMembers && (
                <div className="absolute right-4 top-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {/* Typeahead Dropdown List */}
              {!selectedMember && memberResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border-2 border-gray-200 shadow-xl max-h-60 overflow-y-auto">
                  {memberResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(m);
                        setMemberSearchQuery(m.name);
                      }}
                      className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 flex items-center gap-3 text-lg font-semibold text-gray-800"
                    >
                      <User className="h-5 w-5 text-gray-400" />
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-lg font-bold text-gray-700 mb-2">Purpose of Visit</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-300 text-xl bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="Meeting">Meeting</option>
                <option value="Interview">Interview</option>
                <option value="Delivery">Delivery</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!walkInName || !selectedMember || walkInMutation.isPending}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl text-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            {walkInMutation.isPending ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : 'Check In Now'}
          </button>
        </form>
      )}

      {/* CHECKOUT FLOW */}
      {mode === 'CHECKOUT' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Visitor Check Out</h2>
            <button
              onClick={resetToHome}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold active:scale-95"
            >
              Back
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
            <input
              type="text"
              placeholder="Search your name to check out..."
              value={checkoutQuery}
              onChange={(e) => setCheckoutQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 rounded-2xl border-2 border-gray-300 text-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          {loadingVisitors ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCheckedIn.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-lg">No currently checked-in visitors match.</p>
              ) : (
                filteredCheckedIn.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-200"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{v.fullName}</h3>
                      <p className="text-base text-gray-500">
                        Host: <span className="font-semibold text-gray-700">{v.hostName}</span>
                      </p>
                    </div>
                    <button
                      disabled={checkOutMutation.isPending}
                      onClick={() => handleCheckOut(v)}
                      className="px-6 py-4 bg-red-600 text-white rounded-xl font-bold text-lg shadow hover:bg-red-700 active:scale-95 disabled:opacity-50"
                    >
                      {checkOutMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Check Out'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}