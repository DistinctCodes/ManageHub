'use strict';

import React, { useState } from 'react';
import DevicesTab from './devices-tab';
import LogsTab from './logs-tab';

export default function AccessControlDashboard() {
  const [activeTab, setActiveTab] = useState<'devices' | 'logs'>('devices');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Control System</h1>
          <p className="text-sm text-slate-500">
            Configure hub hardware readers, monitor entry attempts, and oversee perimeter security parameters.
          </p>
        </div>

        {/* Tab Selector Links */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'devices'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registered Devices
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'logs'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Real-Time Access Logs
          </button>
        </div>
      </div>

      {/* Primary Container Render Outlets */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === 'devices' ? <DevicesTab /> : <LogsTab />}
      </div>
    </div>
  );
}