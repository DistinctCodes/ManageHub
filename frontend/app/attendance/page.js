"use client";

import React, { useState, useMemo } from "react";
import AttendanceFilters from "../../components/AttendanceFilters";
import AttendanceTable from "../../components/AttendanceTable";
import { 
  attendanceData, 
  availableRoles, 
  filterAttendanceData 
} from "../../utils/attendanceData";

const AttendancePage = () => {
  const [dateFilter, setDateFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return filterAttendanceData(attendanceData, dateFilter, roleFilter);
  }, [dateFilter, roleFilter]);

  // Handle export functionality
  const handleExport = () => {
    const csvContent = [
      ["User Name", "Role", "Date", "Time In", "Time Out", "Status"],
      ...filteredData.map(record => [
        record.userName,
        record.role,
        record.date,
        record.timeIn,
        record.timeOut,
        record.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Attendance Tracking
          </h1>
          <p className="text-gray-600">
            Monitor and track employee attendance logs with detailed clock-in and clock-out records.
          </p>
        </div>

        {/* Filters */}
        <AttendanceFilters
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          availableRoles={availableRoles}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Records</p>
                <p className="text-2xl font-semibold text-gray-900">{filteredData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unique Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {new Set(filteredData.map(record => record.userName)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unique Roles</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {new Set(filteredData.map(record => record.role)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <AttendanceTable 
          data={filteredData} 
          onExport={handleExport}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
