import React from 'react';

export const metadata = {
  title: 'Visitor Kiosk | Hub Reception',
  description: 'Reception kiosk for visitor check-in and check-out',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-screen bg-white text-gray-900 flex flex-col items-center justify-between p-8 select-none">
      {/* Header with Centered Hub Logo */}
      <header className="w-full flex justify-center py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
            H
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">Hub Reception</span>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <main className="w-full max-w-4xl my-auto flex flex-col items-center justify-center py-6">
        {children}
      </main>

      {/* Touchscreen Footer Note */}
      <footer className="text-center text-sm font-medium text-gray-400 py-2">
        Touchscreen Reception Kiosk • Tap choices to proceed
      </footer>
    </div>
  );
}