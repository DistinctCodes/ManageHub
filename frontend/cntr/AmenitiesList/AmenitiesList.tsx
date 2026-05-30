import React from 'react';
import { Wifi, Car, Printer, Coffee, Monitor, Lock, Dumbbell, Wind, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AmenitiesListProps extends React.HTMLAttributes<HTMLDivElement> {
  amenities: string[];
}

const iconMap: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  printing: Printer,
  coffee: Coffee,
  monitor: Monitor,
  security: Lock,
  gym: Dumbbell,
  'air conditioning': Wind,
  ac: Wind,
};

function capitalizeFirstLetter(string: string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

export function AmenitiesList({ amenities, className, ...props }: AmenitiesListProps) {
  if (!amenities || amenities.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      {amenities.map((amenity, index) => {
        const normalizedKey = amenity.trim().toLowerCase();
        const IconComponent = iconMap[normalizedKey] || Tag;

        return (
          <div
            key={`${normalizedKey}-${index}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-sm font-medium"
          >
            <IconComponent className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>{capitalizeFirstLetter(amenity.trim())}</span>
          </div>
        );
      })}
    </div>
  );
}
