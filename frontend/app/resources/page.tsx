'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Resource } from '@/lib/types/resource';
import { apiClient } from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, Package2, Clock3 } from 'lucide-react';

const RESOURCE_TYPES = ['All', 'Meeting Room', 'Desk', 'Equipment', 'Studio'];

function formatPrice(price?: number) {
  if (!price || price <= 0) return 'Free';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);
}

function ResourceCard({ resource }: { resource: Resource }) {
  const image = resource.imageUrl || resource.images?.[0] || resource.thumbnail || resource.coverImage || '/placeholder.svg';
  const availability = resource.isAvailable ?? resource.available ?? resource.status !== 'Booked';

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
    >
      <div className="relative h-44 overflow-hidden">
        <img src={image} alt={resource.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
            {resource.type || 'Resource'}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${availability ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {availability ? 'Available' : 'Booked'}
          </span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{resource.name}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{resource.description || 'Flexible resource for your team needs.'}</p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <Clock3 className="h-4 w-4" />
            {formatPrice(resource.pricePerHour ?? resource.hourlyPrice ?? resource.price)} / hr
          </span>
          <span className="text-sm font-semibold text-gray-900">{availability ? 'Book now' : 'Unavailable'}</span>
        </div>
      </div>
    </Link>
  );
}

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['resources', { search, type }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (type && type !== 'All') params.set('type', type);
      const response = await apiClient.get<{ success: boolean; data: Resource[] }>('/resources' + (params.toString() ? `?${params.toString()}` : ''));
      return response;
    },
  });

  const resources = useMemo(() => data?.data ?? [], [data?.data]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="text-gray-500 mt-1 text-sm">Find meeting rooms, desks, and equipment for your next session.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2.5 text-sm outline-none ring-0 focus:border-gray-300"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none"
          >
            {RESOURCE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-2xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-gray-500">
          <Package2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">Unable to load resources right now.</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-gray-500">
          <Package2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No resources found.</p>
          <p className="mt-1 text-sm">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
