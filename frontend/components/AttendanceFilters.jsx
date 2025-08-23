import React from "react";
import { calendarIcon, filterIcon } from "../assets";

const AttendanceFilters = ({ 
  dateFilter, 
  setDateFilter, 
  roleFilter, 
  setRoleFilter, 
  availableRoles 
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={filterIcon} alt="filter" className="w-5 h-5" />
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Date Filter */}
          <div className="flex flex-col">
            <label htmlFor="date-filter" className="text-xs font-medium text-gray-600 mb-1">
              Date
            </label>
            <div className="relative">
              <img 
                src={calendarIcon} 
                alt="calendar" 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
              />
              <input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex flex-col">
            <label htmlFor="role-filter" className="text-xs font-medium text-gray-600 mb-1">
              Role
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => {
                setDateFilter("");
                setRoleFilter("All Roles");
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceFilters;
