"use client";

import {
  Wifi,
  Car,
  Coffee,
  Printer,
  Monitor,
  Wind,
  Lock,
  Users,
  Presentation,
  Tag,
} from "lucide-react";
import { ReactNode } from "react";

interface AmenitiesListProps {
  amenities: string[];
}

const AMENITY_ICONS: Record<string, ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  "wi-fi": <Wifi className="w-4 h-4" />,
  parking: <Car className="w-4 h-4" />,
  coffee: <Coffee className="w-4 h-4" />,
  printer: <Printer className="w-4 h-4" />,
  "standing desk": <Monitor className="w-4 h-4" />,
  ac: <Wind className="w-4 h-4" />,
  "air conditioning": <Wind className="w-4 h-4" />,
  locker: <Lock className="w-4 h-4" />,
  "meeting room": <Users className="w-4 h-4" />,
  whiteboard: <Presentation className="w-4 h-4" />,
};

function getAmenityIcon(amenity: string): ReactNode {
  const lower = amenity.toLowerCase();
  return AMENITY_ICONS[lower] || <Tag className="w-4 h-4" />;
}

export default function AmenitiesList({ amenities }: AmenitiesListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {amenities.map((amenity, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100"
        >
          {getAmenityIcon(amenity)}
          <span>{amenity}</span>
        </div>
      ))}
    </div>
  );
}
