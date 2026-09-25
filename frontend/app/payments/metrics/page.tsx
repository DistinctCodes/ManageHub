"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, TrendingUp, AlertCircle, RefreshCw, Layers } from "lucide-react";
import {
  fetchPaymentMetrics,
  PAYMENT_METRICS_REFETCH_INTERVAL,
} from "@/lib/payment-metrics";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminPaymentMetricsPage() {
  const metrics = useQuery({
    queryKey: ["payment-metrics"],
    queryFn: ({ signal }) => fetchPaymentMetrics(signal),
    refetchInterval: PAYMENT_METRICS_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });
  const { data, error, isError, isFetching, isLoading, refetch } = metrics;
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-700 flex items-center gap-3" role="alert">
        <AlertCircle className="h-5 w-5" />
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Metrics Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time administrative analytics for platform transactions.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {isError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          Showing the last successful snapshot. Refresh failed: {errorMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3 text-indigo-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Volume</dt>
                <dd className="text-lg font-semibold text-gray-900">${data.totalVolume.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-50 rounded-md p-3 text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Successful Transactions</dt>
                <dd className="text-lg font-semibold text-gray-900">{data.successfulTransactions.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-50 rounded-md p-3 text-red-600">
              <Layers className="h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Failed Transactions</dt>
                <dd className="text-lg font-semibold text-gray-900">{data.failedTransactions.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Visualizations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Revenue Trend</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Status Distribution</h3>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}