"use client";

import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FloorPlanCanvas from "@/components/floor-plan/FloorPlanCanvas";
import { apiClient } from "@/lib/apiClient";
import { Map } from "lucide-react";

export default function SpacesMapPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["floor-plan", "active"],
    queryFn: () => apiClient.get<any>("/floor-plan/active"),
  });

  const floorPlan = (data as any)?.data;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Floor Plan</h1>
        <p className="text-gray-500 text-sm mt-1">Click a zone to book that workspace.</p>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading floor plan...</div>
      )}

      {(isError || (!isLoading && !floorPlan)) && (
        <div className="text-center py-16 text-gray-400">
          <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">Floor plan coming soon</p>
          <p className="text-sm mt-1">The admin hasn&apos;t published a floor plan yet.</p>
        </div>
      )}

      {floorPlan && (
        <div>
          <h2 className="text-sm font-medium text-gray-600 mb-3">{floorPlan.name}</h2>
          <FloorPlanCanvas floorPlan={floorPlan} />
        </div>
      )}
    </DashboardLayout>
  );
}
